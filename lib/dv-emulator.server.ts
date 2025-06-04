/**
 * DV Camera Emulator for testing capture functionality without physical hardware
 * Server-side only implementation
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

export interface EmulatedDevice {
  id: string;
  name: string;
  type: 'DV' | 'HDV';
  connected: boolean;
}

export class DVEmulator {
  private static instance: DVEmulator;
  private emulatedDevices: EmulatedDevice[] = [
    {
      id: 'emu-dv-001',
      name: 'Sony DCR-TRV900 (Emulated)',
      type: 'DV',
      connected: true
    },
    {
      id: 'emu-dv-002', 
      name: 'Canon XM2 (Emulated)',
      type: 'DV',
      connected: true
    }
  ];

  private constructor() {}

  static getInstance(): DVEmulator {
    if (!DVEmulator.instance) {
      DVEmulator.instance = new DVEmulator();
    }
    return DVEmulator.instance;
  }

  /**
   * Simulate device detection
   */
  async listDevices(): Promise<{ success: boolean; devices?: string[]; message: string; error?: string }> {
    // Simulate some delay like real device detection
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Randomly simulate no devices occasionally for testing
    if (Math.random() < 0.1) {
      return {
        success: true,
        devices: [],
        message: 'No DV devices detected (emulated)'
      };
    }

    const connectedDevices = this.emulatedDevices
      .filter(device => device.connected)
      .map(device => device.name);

    return {
      success: true,
      devices: connectedDevices,
      message: `Found ${connectedDevices.length} emulated DV device(s)`
    };
  }  /**
   * Start emulated capture process
   */
  async startCapture(outputPath: string): Promise<ChildProcess> {
    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Create a simple mock process using a basic Node.js command
    // This avoids dynamic file creation that Next.js can't analyze
    const captureProcess = spawn('node', ['-e', `
      const fs = require('fs');
      const path = require('path');
      
      let progress = 0;
      const totalFrames = 1000 + Math.floor(Math.random() * 2000);
      const outputPath = '${outputPath.replace(/\\/g, '\\\\')}';
      
      console.log('DV Emulator: Starting capture to ' + outputPath);
      console.log('DV Emulator: Estimated ' + totalFrames + ' frames');
      
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 50) + 10;
        
        if (progress >= totalFrames) {
          progress = totalFrames;
          console.log('DV Emulator: Capture completed - ' + progress + '/' + totalFrames + ' frames');
          
          try {
            fs.writeFileSync(outputPath, 'DUMMY_DV_VIDEO_DATA_' + Date.now());
            console.log('DV Emulator: Saved dummy file to ' + outputPath);
          } catch (err) {
            console.error('DV Emulator: Error saving file:', err.message);
          }
          
          clearInterval(interval);
          process.exit(0);
        } else {
          console.log('DV Emulator: Progress - ' + progress + '/' + totalFrames + ' frames (' + Math.round((progress/totalFrames)*100) + '%)');
        }
      }, 2000 + Math.random() * 3000);
      
      process.on('SIGTERM', () => {
        console.log('DV Emulator: Capture cancelled by user');
        clearInterval(interval);
        process.exit(1);
      });
      
      process.on('SIGINT', () => {
        console.log('DV Emulator: Capture interrupted');
        clearInterval(interval);
        process.exit(1);
      });
    `], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    });

    return captureProcess;
  }

  /**
   * Generate emulator script content
   */
  private generateEmulatorScript(outputPath: string): string {
    return `
const fs = require('fs');
const path = require('path');

let progress = 0;
const totalFrames = 1000 + Math.floor(Math.random() * 2000); // 1-3k frames
const outputPath = ${JSON.stringify(outputPath)};

console.log('DV Emulator: Starting capture to ' + outputPath);
console.log('DV Emulator: Estimated ' + totalFrames + ' frames');

// Simulate capture progress
const interval = setInterval(() => {
  progress += Math.floor(Math.random() * 50) + 10; // Random progress increment
  
  if (progress >= totalFrames) {
    progress = totalFrames;
    console.log('DV Emulator: Capture completed - ' + progress + '/' + totalFrames + ' frames');
    
    // Create a dummy video file
    try {
      fs.writeFileSync(outputPath, 'DUMMY_DV_VIDEO_DATA_' + Date.now());
      console.log('DV Emulator: Saved dummy file to ' + outputPath);
    } catch (err) {
      console.error('DV Emulator: Error saving file:', err.message);
    }
    
    clearInterval(interval);
    process.exit(0);
  } else {
    console.log('DV Emulator: Progress - ' + progress + '/' + totalFrames + ' frames (' + Math.round((progress/totalFrames)*100) + '%)');
  }
}, 2000 + Math.random() * 3000); // Progress every 2-5 seconds

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('DV Emulator: Capture cancelled by user');
  clearInterval(interval);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('DV Emulator: Capture interrupted');
  clearInterval(interval);
  process.exit(1);
});
    `.trim();
  }

  /**
   * Toggle device connection status (for testing)
   */
  toggleDevice(deviceId: string): boolean {
    const device = this.emulatedDevices.find(d => d.id === deviceId);
    if (device) {
      device.connected = !device.connected;
      return device.connected;
    }
    return false;
  }

  /**
   * Add a new emulated device
   */
  addEmulatedDevice(name: string, type: 'DV' | 'HDV' = 'DV'): string {
    const deviceId = `emu-${type.toLowerCase()}-${Date.now()}`;
    this.emulatedDevices.push({
      id: deviceId,
      name: `${name} (Emulated)`,
      type,
      connected: true
    });
    return deviceId;
  }

  /**
   * Get all emulated devices
   */
  getEmulatedDevices(): EmulatedDevice[] {
    return [...this.emulatedDevices];
  }
}

export default DVEmulator;
