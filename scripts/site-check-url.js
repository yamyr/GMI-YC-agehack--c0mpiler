export function localizedUrl(base, path, language) {
  const url = new URL(path, base);
  url.searchParams.set("lang", language);
  return url.href;
}
