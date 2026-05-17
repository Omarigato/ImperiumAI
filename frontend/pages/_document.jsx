import { Html, Head, Main, NextScript } from 'next/document';

/**
 * Pre-hydration init script.
 *
 * Reads the user's saved theme from localStorage and applies it to
 * `<html data-theme="…">` *before* React mounts. Without this, the first
 * paint is always `data-theme="dark"` (the SSR default) and users on the
 * `light` / `bw` themes see a tiny flash of dark UI before hydration.
 *
 * Wrapped in a try/catch — runs even if localStorage is disabled.
 */
const PRE_HYDRATION_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem('aegis-theme');
    if (t === 'light' || t === 'bw') {
      document.documentElement.setAttribute('data-theme', t);
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch (_) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
`;

export default function Document() {
  return (
    <Html lang="en" data-theme="dark">
      <Head>
        {/* Apply persisted theme synchronously so there's no flash. */}
        <script
          dangerouslySetInnerHTML={{ __html: PRE_HYDRATION_SCRIPT }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
