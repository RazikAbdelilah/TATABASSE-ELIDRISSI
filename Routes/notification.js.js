module.exports.notifyClients = (io, message) => {
  if (io) {
    io.emit('newCandidate', message);  // إرسال الرسالة عبر WebSocket
  } else {
    console.error('Socket.io is not initialized');
  }
};
