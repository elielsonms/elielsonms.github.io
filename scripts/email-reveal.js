document.addEventListener('DOMContentLoaded', function() {
    const emails = document.querySelectorAll('.email-obfuscated');
    emails.forEach(el => {
      const email = el.dataset.email;
      if (email) {
        el.outerHTML = '<a href="mailto:' + email + '">' + email + '</a>';
      }
    });
  });