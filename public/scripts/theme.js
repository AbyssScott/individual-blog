(function () {
  const themeButton = document.getElementById('theme-toggle');
  if (themeButton) {
    themeButton.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('blog-theme', next); } catch (error) { /* storage optional */ }
      const iframe = document.querySelector('iframe.giscus-frame');
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ giscus: { setConfig: { theme: next === 'dark' ? 'transparent_dark' : 'light' } } }, 'https://giscus.app');
      }
    });
  }
  document.querySelectorAll('[data-language-switch]').forEach((link) => {
    link.addEventListener('click', () => {
      try { localStorage.setItem('blog-language', link.getAttribute('data-language-switch')); }
      catch (error) { /* storage optional */ }
    });
  });
})();
