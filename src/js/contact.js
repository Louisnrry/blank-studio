// Formulaire de contact (démo, sans backend) : validation + état de succès.
export function initContact() {
  const form = document.querySelector('#contact-form');
  const status = document.querySelector('#form-status');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      setStatus('Merci de remplir prénom, nom et email (email valide requis).', 'err');
      form.reportValidity();
      return;
    }
    const btn = form.querySelector('.contact-submit-label');
    const original = btn ? btn.textContent : '';
    if (btn) btn.textContent = 'Envoi…';
    setStatus('', '');

    // Simulation d'envoi — à brancher sur ton backend / Formspree / API.
    setTimeout(() => {
      if (btn) btn.textContent = original;
      setStatus('Message envoyé. On te répond sous 48 h ouvrées.', 'ok');
      form.reset();
    }, 900);
  });

  function setStatus(msg, kind) {
    if (!status) return;
    status.textContent = msg;
    status.className = kind || '';
  }
}
