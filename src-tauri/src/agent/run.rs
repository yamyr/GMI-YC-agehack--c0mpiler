//! Spawn the Codex CLI safely (research R2, R6). Thin wrapper; verified manually per quickstart.

use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicU64, Ordering};
use std::thread;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

pub const TURN_TIMEOUT: Duration = Duration::from_secs(60);
pub const PROBE_TIMEOUT: Duration = Duration::from_secs(45);
pub const LOGIN_TIMEOUT: Duration = Duration::from_secs(20);

pub struct RunOutput {
    pub exit_ok: bool,
    /// stdout and stderr together, for classification and error messages.
    pub log: String,
    /// Contents of `-o <file>` when Codex wrote one.
    pub last_message: Option<String>,
}

pub enum RunError {
    Timeout,
    Spawn(String),
}

/// An empty, private working folder for one call; removed on drop.
pub struct Scratch(PathBuf);

impl Scratch {
    pub fn new() -> std::io::Result<Self> {
        static COUNTER: AtomicU64 = AtomicU64::new(0);
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or_default();
        let dir = std::env::temp_dir().join(format!(
            "agely-agent-{}-{}-{}",
            std::process::id(),
            nanos,
            COUNTER.fetch_add(1, Ordering::Relaxed)
        ));
        fs::create_dir_all(&dir)?;
        Ok(Self(dir))
    }

    pub fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

/// Arguments shared by every `codex exec` call: no user config or rules, no saved session,
/// read-only sandbox in the scratch folder, apps/browser/computer use disabled.
pub fn exec_args(workdir: &Path, model: &str) -> Vec<String> {
    let mut args: Vec<String> = [
        "exec",
        "--ignore-user-config",
        "--ignore-rules",
        "--skip-git-repo-check",
        "--ephemeral",
        "--sandbox",
        "read-only",
        "--disable",
        "apps",
        "--disable",
        "browser_use",
        "--disable",
        "computer_use",
    ]
    .iter()
    .map(|s| s.to_string())
    .collect();
    args.extend([
        "-C".into(),
        workdir.display().to_string(),
        "-m".into(),
        model.into(),
    ]);
    args
}

/// Runs `bin args…` with stdin closed (codex waits on an open stdin), output captured to files
/// in `scratch`, killed after `timeout`.
pub fn run(
    bin: &Path,
    args: &[String],
    scratch: &Scratch,
    last_message_file: Option<&Path>,
    timeout: Duration,
) -> Result<RunOutput, RunError> {
    let log_path = scratch.path().join("log.txt");
    let log_file = fs::File::create(&log_path).map_err(|e| RunError::Spawn(e.to_string()))?;
    let log_err = log_file
        .try_clone()
        .map_err(|e| RunError::Spawn(e.to_string()))?;

    let mut child = Command::new(bin)
        .args(args)
        .current_dir(scratch.path())
        .stdin(Stdio::null())
        .stdout(Stdio::from(log_file))
        .stderr(Stdio::from(log_err))
        .spawn()
        .map_err(|e| RunError::Spawn(e.to_string()))?;

    let started = Instant::now();
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) if started.elapsed() >= timeout => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(RunError::Timeout);
            }
            Ok(None) => thread::sleep(Duration::from_millis(100)),
            Err(e) => return Err(RunError::Spawn(e.to_string())),
        }
    };

    Ok(RunOutput {
        exit_ok: status.success(),
        log: fs::read_to_string(&log_path).unwrap_or_default(),
        last_message: last_message_file
            .and_then(|p| fs::read_to_string(p).ok())
            .filter(|s| !s.trim().is_empty()),
    })
}

/// Last non-empty line mentioning an error, for a short plain message.
pub fn error_line(log: &str) -> String {
    log.lines()
        .rev()
        .find(|l| l.contains("ERROR") || l.contains("error"))
        .or_else(|| log.lines().rev().find(|l| !l.trim().is_empty()))
        .unwrap_or("no output")
        .chars()
        .take(240)
        .collect()
}
