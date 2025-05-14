// Modificar esta línea en tu script
socket.on('connect', () => {
    console.log('Conectado al servidor Socket.IO');
    // Solicitar QR automáticamente al conectar
    socket.emit('request_qr');
  });
  
  // Agregar un botón de desconexión si lo necesitas
  const disconnectBtn = document.createElement('button');
  disconnectBtn.textContent = 'Desconectar WhatsApp';
  disconnectBtn.style.marginTop = '20px';
  disconnectBtn.addEventListener('click', () => {
    socket.emit('disconnect_whatsapp');
  });
  document.body.appendChild(disconnectBtn);