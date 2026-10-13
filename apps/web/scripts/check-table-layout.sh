#!/usr/bin/env bash
set -euo pipefail

# Run against a local dev server: bash apps/web/scripts/check-table-layout.sh
# Pass an existing ego-browser task space ID as the first argument to reuse it.
if [[ -n "${1:-}" && ! "$1" =~ ^[0-9]+$ ]]; then
  echo "Task space ID must be a number" >&2
  exit 1
fi
{
  if [[ -n "${1:-}" ]]; then
    printf 'const task = await taskSpace(%s);\n' "$1"
  else
    printf "const task = await taskSpace('Check homepage table layout');\n"
  fi
  cat <<'JS' 
console.log({ taskSpaceId: task.spaceId });
const page = task.page('p1');

for (const width of [1280, 390]) {
  await page.cdp('Emulation.setDeviceMetricsOverride', {
    width, height: 844, deviceScaleFactor: 1, mobile: false,
  });
  await page.goto('http://localhost:3000');
  await page.click('loc=css:button[aria-label="Table view"]');
  await page.waitForSelector('section[aria-label="Model comparison"]');
  const result = await page.evaluate(() => {
    const region = document.querySelector('section[aria-label="Model comparison"]');
    const footerEnd = document.querySelector('footer').getBoundingClientRect().bottom + scrollY;
    return {
      viewport: document.documentElement.clientWidth,
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      blankSpaceAfterFooter: document.documentElement.scrollHeight - footerEnd,
      tableScrolls: region.scrollHeight > region.clientHeight,
      rows: region.querySelectorAll('tbody tr').length,
    };
  });
  console.log(result);
  if (result.blankSpaceAfterFooter > 2 || result.horizontalOverflow > 2 || !result.tableScrolls || result.rows === 0) {
    throw new Error(`Table layout regression at ${width}px: content escapes the table scroll region`);
  }
}
await task.finish({ keep: [] });
JS
} | ego-browser nodejs
