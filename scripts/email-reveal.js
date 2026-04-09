function revealObfuscatedEmails(root = document) {
  const emails = root.querySelectorAll('.email-obfuscated');

  function decodeCodes(rawCodes) {
    return rawCodes
      .split(',')
      .filter(Boolean)
      .map(code => String.fromCharCode(Number(code)))
      .join('');
  }

  emails.forEach(el => {
    const localCodes = el.dataset.localCodes;
    const domainCodes = el.dataset.domainCodes;

    if (!localCodes || !domainCodes) {
      return;
    }

    const email = `${decodeCodes(localCodes)}@${decodeCodes(domainCodes)}`;
    el.outerHTML = '<a href="mailto:' + email + '">' + email + '</a>';
  });
}

window.revealObfuscatedEmails = revealObfuscatedEmails;

document.addEventListener('DOMContentLoaded', function() {
  revealObfuscatedEmails();
});
