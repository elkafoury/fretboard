import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SmartLightBluetoothService {
  /**
   * If Bluetooth is connected, send the selected note to the device
   */
  async sendSelectedNoteIfConnected(noteName: string): Promise<void> {
    // Check if Bluetooth is connected
    if (this.connectedDevice && this.connectedDevice.gatt?.connected && this.serialCharacteristic) {
      await this.setLedByNote(noteName, true);
    } else {
      console.warn('Bluetooth not connected. Cannot send note.');
    }
  }
  bluetoothDevices: BluetoothDevice[] = []; // List of discovered Bluetooth devices
  connectedDevice: BluetoothDevice | null = null; // Currently connected device
  // Octaves array (converted from Java)
  octaves: number[][] = [
    [0, 0, 0, 0, 0, 1],
    [0, 0, 0, 0, 0, 1],
    [0, 1, 2, 1, 0, 1],
    [1, 1, 2, 1, 1, 2],
    [1, 1, 2, 2, 1, 2],
    [2, 2, 3, 2, 3, 3],
    [2, 2, 3, 2, 3, 3],
    [3, 4, 4, 3, 3, 4],
    [3, 4, 4, 3, 4, 4],
    [3, 4, 5, 5, 4, 4],
    [4, 5, 5, 5, 5, 5],
    [4, 5, 5, 5, 5, 5],
    [6, 6, 6, 6, 6, 7],
    [6, 6, 6, 6, 6, 7],
    [6, 7, 8, 7, 6, 7],
    [7, 7, 8, 7, 7, 8],
    [7, 7, 8, 8, 7, 8],
    [8, 8, 9, 8, 9, 9],
    [8, 8, 9, 8, 9, 9],
    [9, 10, 10, 9, 9, 10],
    [9, 10, 10, 9, 10, 10],
    [9, 10, 11, 11, 10, 10]
  ];

  // Notes array (converted from Java)
  Notes: number[][] = [
    [7, 0, 5, 10, 2, 7],
    [8, 1, 6, 11, 3, 8],
    [9, 2, 7, 0, 4, 9],
    [10, 3, 8, 1, 5, 10],
    [11, 4, 9, 2, 6, 11],
    [0, 5, 10, 3, 7, 0],
    [1, 6, 11, 4, 8, 1],
    [2, 7, 0, 5, 9, 2],
    [3, 8, 1, 6, 10, 3],
    [4, 9, 2, 7, 11, 4],
    [5, 10, 3, 8, 0, 5],
    [6, 11, 4, 9, 1, 6],
    [7, 0, 5, 10, 2, 7],
    [7, 0, 5, 10, 2, 7],
    [8, 1, 6, 11, 3, 8],
    [9, 2, 7, 0, 4, 9],
    [10, 3, 8, 1, 5, 10],
    [11, 4, 9, 2, 6, 11],
    [0, 5, 10, 3, 7, 0],
    [1, 6, 11, 4, 8, 1],
    [2, 7, 0, 5, 9, 2],
    [3, 8, 1, 6, 10, 3],
    [4, 9, 2, 7, 11, 4],
    [5, 10, 3, 8, 0, 5],
    [6, 11, 4, 9, 1, 6],
    [7, 0, 5, 10, 2, 7]
  ];

  /**
   * Get the octave for a given fret and string
   */
  getOctave(fret: number, string: number): number {
    return this.octaves[fret][string];
  }

  /**
   * Get the note for a given fret and string
   */
  getNote(fret: number, string: number): number {
    return this.Notes[fret][string];
  }
  /**
   * Light all LEDs for a given note name across the fretboard.
   * Uses Notes array to find all fret/string positions for the note and lights corresponding LEDs.
   * @param noteName The note name to light (e.g., 'C', 'D#', 'F')
   * @param on True to turn on, false to turn off
   */
  async setLedByNote(noteName: string, on: boolean): Promise<void> {
    // Map note names to note numbers (0=C, 1=C#/Db, ..., 11=B)
    const noteMap: { [key: string]: number } = {
      'C': 3, 'C#': 4, 'Db': 4,
      'D': 5, 'D#': 6, 'Eb': 6,
      'E': 7,
      'F': 8, 'F#': 9, 'Gb': 9,
      'G': 10, 'G#': 11, 'Ab': 11,
      'A': 0, 'A#': 1, 'Bb': 1,
      'B': 2
    };
    const noteNum = noteMap[noteName];
    if (noteNum === undefined) throw new Error('Invalid note name');

    //display the note on every octave
    const octaveVal = [0,1,2,3,4,5,6,7,8,9,10,11]; // Example octave values]
          if (on) {
            // Turn LED on: 69, note, all 12 octaves
            for (let octave of octaveVal) {
              await this.sendSerialData([69, noteNum, octave]);
            }
          } else {
            //or turn it off for all octaves
            for (let octave of octaveVal) {
              await this.sendSerialData([68, noteNum, octave]);
            }
          }
  }


  async sendDataSet(noteName: string[]): Promise<void> {

    const  notes: string[] = ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'];
    
     const result: number[] = [];
     for (let note of notes) {
        if (noteName.includes(note)) {
            result.push(63);  // for first 6 octaves
            result.push(63);  //second byte for the rest of octaves
        }else {
            result.push(0); //zeros for all octaves
            result.push(0);   //second byte for the rest of octaves
        }
    }
console.log('Resulting byte array:', result);
  await this.sendSerialData([65, ...result]); // 65 is the command to download dataset to the device
   
  }

  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private serialServiceUUID = '0000ffe0-0000-1000-8000-00805f9b34fb'; // Example UUID for 8-bit serial
  private serialCharacteristicUUID = '0000ffe1-0000-1000-8000-00805f9b34fb'; // Example UUID for 8-bit serial
  private serialCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async connect(): Promise<void> {
    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [this.serialServiceUUID] }],
        optionalServices: [this.serialServiceUUID]
      });
      this.server = await this.device.gatt?.connect() || null;
      if (this.server) {
        const service = await this.server.getPrimaryService(this.serialServiceUUID);
        this.serialCharacteristic = await service.getCharacteristic(this.serialCharacteristicUUID);
      }
    } catch (error) {
      console.error('Bluetooth connection error:', error);
      throw error;   
    }
  }

  async sendSerialData(data: number[]): Promise<void> {

    if (!this.serialCharacteristic) throw new Error('Not connected to serial characteristic');
    // Convert array of numbers (0-255) to Uint8Array
    const buffer = new Uint8Array(data);
    console.log('Sending data to Bluetooth device:', buffer);
    await this.serialCharacteristic.writeValue(buffer);
  }

  async readSerialData(): Promise<number[] | null> {
    if (!this.serialCharacteristic) throw new Error('Not connected to serial characteristic');
    const value = await this.serialCharacteristic.readValue();
    const result: number[] = [];
    for (let i = 0; i < value.byteLength; i++) {
      result.push(value.getUint8(i));
    }
    return result;
  }

  disconnect(): void {
    if (this.device && this.device.gatt?.connected) {
      this.device.gatt.disconnect();
      this.device = null;
      this.server = null;
      this.serialCharacteristic = null;
    }
  }

  // Discover nearby Bluetooth devices
  async discoverDevices(): Promise<void> {
    try {
      // Clear the list before each discovery
      this.bluetoothDevices = [];
     const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: false, // Accept all devices
      optionalServices: [], // Add specific services if needed
      // Optional: specify device filters
     filters: [{ name: 'NBB7S' }],
    });  

   
    /* const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: ['0000ffe0-0000-1000-8000-00805f9b34fb'] }], // HC-06 service UUID
      optionalServices: ['0000ffe1-0000-1000-8000-00805f9b34fb'] // Optional service for data transfer
    }); */

    // Debug: log the discovered device name
    if (device) {
      console.log('Found device:', device);
    }

     
 
    } catch (error) {
      console.error('Error discovering Bluetooth devices:', error);
    }

  }

  async discoverDevicesNew() {
  try {
    const device = await navigator.bluetooth.requestDevice({
    filters: [{ services: ['<<!nav>>00001800-0000-1000-8000-00805f9b34fb<<!/nav>>'] }] // Generic Access Profile service
})
    // Connect to the GATT server
    if (!device.gatt) {
      throw new Error('GATT server not available on device');
    }
    const server = await device.gatt.connect();

    // Get the primary service
    const service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');

    // Get the characteristic for writing and reading data
    const characteristic = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');

    console.log('Connected to HC-06 device:', device);
    // You can now interact with the characteristic to send/receive data
  } catch (error) {
    console.error('Bluetooth connection error:', error);
  }
}




  // Connect to a selected Bluetooth device
  async connectToDevice(device: BluetoothDevice): Promise<void> {
    try {
      const server = await device.gatt?.connect();
      if (server) {
        this.connectedDevice = device;
        console.log('Connected to device:', device.name);
      }
    } catch (error) {
      console.error('Error connecting to device:', error);
    }
  }

  

  // Disconnect from the currently connected device
  disconnectDevice(): void {
    if (this.connectedDevice?.gatt?.connected) {
      this.connectedDevice.gatt.disconnect();
      console.log('Disconnected from device:', this.connectedDevice.name);
      this.connectedDevice = null;
    }
  }

}
