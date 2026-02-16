MDNS component goal:

persisten enable/disable button with usepersistedref amd watcher.

export a candidate broker which can be cleared. store broker as ServiceEntry, not persisted.

if wifi connected and enabled: maintain a list mdns scan results for mqtt-ws and mqtt-wss candidate brokers

optionally show the list and radio button to select a candidate



mqtt interaction:
a connect disables MDNS scan
a disconnect reenables MDNS scan


q: always scan when wifi? NO, power and wifi sleep disabled

