//! Find the `codex` binary (research R4). Apps launched from Finder get a minimal PATH, so common
//! install directories are searched too.

use std::path::{Path, PathBuf};

const COMMON_DIRS_UNDER_HOME: [&str; 4] =
    [".npm-global/bin", ".local/bin", ".bun/bin", ".volta/bin"];
const COMMON_DIRS: [&str; 2] = ["/opt/homebrew/bin", "/usr/local/bin"];

/// `env_bin` is `AGELY_CODEX_BIN`; when set it is the only candidate. `exists` is injected so the
/// search order can be tested without touching the file system.
pub fn find_codex(
    env_bin: Option<&str>,
    path_var: Option<&str>,
    home: Option<&Path>,
    exists: impl Fn(&Path) -> bool,
) -> Option<PathBuf> {
    if let Some(bin) = env_bin.map(str::trim).filter(|b| !b.is_empty()) {
        let bin = PathBuf::from(bin);
        return exists(&bin).then_some(bin);
    }

    let mut candidates: Vec<PathBuf> = path_var
        .unwrap_or_default()
        .split(':')
        .filter(|dir| !dir.is_empty())
        .map(|dir| Path::new(dir).join("codex"))
        .collect();
    if let Some(home) = home {
        candidates.extend(
            COMMON_DIRS_UNDER_HOME
                .iter()
                .map(|dir| home.join(dir).join("codex")),
        );
    }
    candidates.extend(COMMON_DIRS.iter().map(|dir| Path::new(dir).join("codex")));

    candidates.into_iter().find(|candidate| exists(candidate))
}
