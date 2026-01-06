const WebSocket = require('ws');

const PORT = 8080; // port serwera
const wss = new WebSocket.Server({ port: PORT });

let driver = null;
let passenger = null;

console.log(`Serwer WebSocket uruchomiony na porcie ${PORT}`);

wss.on('connection', (ws) => {
  // Przydzielanie roli
  if (!driver) {
    driver = ws;
    ws.role = 'driver';
    ws.send(JSON.stringify({ role: 'driver', message: 'Jesteś kierowcą' }));
    console.log('Nowy kierowca połączony');
  } else if (!passenger) {
    passenger = ws;
    ws.role = 'passenger';
    ws.send(JSON.stringify({ role: 'passenger', message: 'Jesteś pasażerem' }));
    console.log('Nowy pasażer połączony');

    // Jeśli kierowca już wysłał swoje dane, przekaż je pasażerowi
    if (driver.driverData) {
      ws.send(JSON.stringify({ type: 'driverData', data: driver.driverData }));
    }
  } else {
    // więcej niż 2 osoby
    ws.send(JSON.stringify({ message: 'Sesja pełna' }));
    ws.close();
    return;
  }

  // Odbieranie wiadomości od klienta
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);

      // Kierowca wysyła dane startu i celu
      if (ws.role === 'driver' && msg.type === 'driverData') {
        ws.driverData = msg.data;
        console.log('Otrzymano dane kierowcy:', msg.data);

        // Przekaż do pasażera jeśli już jest połączony
        if (passenger) {
          passenger.send(JSON.stringify({ type: 'driverData', data: msg.data }));
        }
      }

    } catch (err) {
      console.error('Błąd parsowania wiadomości:', err);
    }
  });

  // Obsługa rozłączenia
  ws.on('close', () => {
    if (ws.role === 'driver') driver = null;
    if (ws.role === 'passenger') passenger = null;
    console.log(`Klient ${ws.role} rozłączony`);
  });
});
