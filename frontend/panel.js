// frontend/panel.js v1.1.1
console.log('panel.js v1.1.1 – iniciando...');

document.addEventListener('DOMContentLoaded', () => {
  // --- Selección de elementos del DOM ---
  const emailInput        = document.getElementById('email');
  const passwordInput     = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('toggle-password');
  const eyeIcon           = document.getElementById('eye-icon');
  const eyeOffIcon        = document.getElementById('eye-off-icon');
  const emailError        = document.getElementById('email-error');
  const passwordError     = document.getElementById('password-error');
  const formErrorDiv      = document.getElementById('form-error');
  const rememberMeCheckbox = document.getElementById('remember-me');
  const loginModeInput    = document.getElementById('login-mode');
  const userModeBtn       = document.getElementById('user-mode-btn');
  const adminModeBtn      = document.getElementById('admin-mode-btn');
  const loginButton       = document.getElementById('login-submit-button');
  const loginButtonText   = document.querySelector('#login-submit-button .button-text');
  const loginForm         = document.getElementById('main-login-form');

  // --- Validación de email ---
  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  // --- Toggle mostrar/ocultar contraseña ---
  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener('click', () => {
      const isPwd = passwordInput.type === 'password';
      passwordInput.type = isPwd ? 'text' : 'password';
      if (eyeIcon) eyeIcon.style.display = isPwd ? 'none' : 'block';
      if (eyeOffIcon) eyeOffIcon.style.display = isPwd ? 'block' : 'none';
      togglePasswordBtn.setAttribute(
        'aria-label',
        isPwd ? 'Ocultar contraseña' : 'Mostrar contraseña'
      );
    });
  }

  // --- Envío del formulario ---
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      let hasError = false;

      // Limpiar errores
      [emailError, passwordError, formErrorDiv].forEach(el => {
        if (el) { el.textContent = ''; el.style.display = 'none'; }
      });
      [emailInput, passwordInput].forEach(el => {
        if (el) el.classList.remove('border-red-500');
      });

      // Validaciones básicas
      const emailVal    = emailInput ? emailInput.value.trim() : '';
      const passwordVal = passwordInput ? passwordInput.value : '';

      if (!emailVal) {
        if (emailError) {
          emailError.textContent = 'El correo es obligatorio';
          emailError.style.display = 'block';
        }
        if (emailInput) emailInput.classList.add('border-red-500');
        hasError = true;
      } else if (!validateEmail(emailVal)) {
        if (emailError) {
          emailError.textContent = 'Formato de correo inválido';
          emailError.style.display = 'block';
        }
        if (emailInput) emailInput.classList.add('border-red-500');
        hasError = true;
      }

      if (!passwordVal) {
        if (passwordError) {
          passwordError.textContent = 'La contraseña es obligatoria';
          passwordError.style.display = 'block';
        }
        if (passwordInput) passwordInput.classList.add('border-red-500');
        hasError = true;
      }

      if (hasError) return;

      // Preparar UI de carga
      const originalText = loginButtonText ? loginButtonText.textContent : 'Iniciar sesión';
      if (loginButton) loginButton.setAttribute('aria-busy', 'true');
      if (loginButtonText) loginButtonText.textContent = 'Ingresando...';

      try {
        // Usamos URL relativa para no depender de hostname/puerto
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: emailVal,
            password: passwordVal,
            mode: loginModeInput ? loginModeInput.value : 'user',
            rememberMe: rememberMeCheckbox ? rememberMeCheckbox.checked : false
          })
        });

        if (response.ok) {
          const data = await response.json();
          handleLoginSuccess(data);
        } else {
          const data = await response.json();
          throw new Error(data.message || `Error ${response.status}`);
        }
      } catch (err) {
        console.error('Error en login:', err);
        if (formErrorDiv) {
          formErrorDiv.textContent = err.message;
          formErrorDiv.style.display = 'block';
        }
      } finally {
        // Restaurar botón
        if (loginButton) loginButton.setAttribute('aria-busy', 'false');
        if (loginButtonText) loginButtonText.textContent = originalText;
      }
    });
  } else {
    console.error('No se encontró #main-login-form en el DOM.');
  }

  function handleLoginSuccess(response) {
    // Guardar token y datos de usuario
    localStorage.setItem('token', response.token);
    localStorage.setItem('userData', JSON.stringify(response.user));
    
    // Redireccionar directamente al dashboard.html
    // ***** CAMBIO REALIZADO AQUÍ *****
    window.location.href = '/dashboard.html'; 
  }
});
