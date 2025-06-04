/**
 * DV Camera Emulator for testing capture functionality without physical hardware
 * Server-side only implementation that avoids Next.js bundling issues
 */

import { ChildProcess } from "child_process";
import { EventEmitter } from "events";
import path from "path";
import fs from "fs/promises";

// Mock ChildProcess class for emulation that behaves like a real ChildProcess
class MockChildProcess extends EventEmitter {
  public stdout: EventEmitter;
  public stderr: EventEmitter;
  public stdin: EventEmitter;
  public pid?: number;
  private interval?: NodeJS.Timeout;
  private progress = 0;
  private totalFrames: number;
  private outputPath: string;

  constructor(outputPath: string) {
    super();
    this.stdout = new EventEmitter();
    this.stderr = new EventEmitter();
    this.stdin = new EventEmitter();
    this.pid = Math.floor(Math.random() * 10000) + 1000;
    this.totalFrames = 1000 + Math.floor(Math.random() * 2000);
    this.outputPath = outputPath;

    // Start the mock capture process after a short delay
    setTimeout(() => this.startMockCapture(), 100);
  }

  private startMockCapture() {
    const startMessage = `DV Emulator: Starting capture to ${this.outputPath}`;
    const framesMessage = `DV Emulator: Estimated ${this.totalFrames} frames`;

    console.log(startMessage);
    console.log(framesMessage);
    this.stdout.emit("data", startMessage + "\n");
    this.stdout.emit("data", framesMessage + "\n");

    this.interval = setInterval(() => {
      this.progress += Math.floor(Math.random() * 50) + 10;

      if (this.progress >= this.totalFrames) {
        this.progress = this.totalFrames;
        this.completeCapture();
      } else {
        const percentage = Math.round((this.progress / this.totalFrames) * 100);
        const message = `DV Emulator: Progress - ${this.progress}/${this.totalFrames} frames (${percentage}%)`;
        console.log(message);
        this.stdout.emit("data", message + "\n");
      }
    }, 2000 + Math.random() * 3000);
  }

  private async completeCapture() {
    if (this.interval) {
      clearInterval(this.interval);
    }

    try {
      const dummyData = `DUMMY_DV_VIDEO_DATA_${Date.now()}`;
      await fs.writeFile(this.outputPath, dummyData);

      const completeMessage = `DV Emulator: Capture completed - ${this.progress}/${this.totalFrames} frames`;
      const savedMessage = `DV Emulator: Saved dummy file to ${this.outputPath}`;

      console.log(completeMessage);
      console.log(savedMessage);

      this.stdout.emit("data", completeMessage + "\n");
      this.stdout.emit("data", savedMessage + "\n");
      this.emit("close", 0);
    } catch (error) {
      const errorMessage = `DV Emulator: Error saving file: ${error}`;
      console.error(errorMessage);
      this.stderr.emit("data", errorMessage + "\n");
      this.emit("close", 1);
    }
  }

  kill(signal?: string | number): boolean {
    if (this.interval) {
      clearInterval(this.interval);
    }

    const message =
      signal === "SIGTERM"
        ? "Capture cancelled by user"
        : "Capture interrupted";
    console.log(`DV Emulator: ${message}`);
    this.stdout.emit("data", `DV Emulator: ${message}\n`);
    this.emit("close", 1);
    return true;
  }
}

export interface EmulatedDevice {
  id: string;
  name: string;
  type: "DV" | "HDV";
  connected: boolean;
}

export class DVEmulator {
  private static instance: DVEmulator;
  private emulatedDevices: EmulatedDevice[] = [
    {
      id: "emu-dv-001",
      name: "Sony DCR-TRV900 (Emulated)",
      type: "DV",
      connected: true,
    },
    {
      id: "emu-dv-002",
      name: "Canon XM2 (Emulated)",
      type: "DV",
      connected: true,
    },
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
  async listDevices(): Promise<{
    success: boolean;
    devices?: string[];
    message: string;
    error?: string;
  }> {
    // Simulate some delay like real device detection
    await new Promise((resolve) =>
      setTimeout(resolve, 500 + Math.random() * 1000)
    );

    // Randomly simulate no devices occasionally for testing
    if (Math.random() < 0.1) {
      return {
        success: true,
        devices: [],
        message: "No DV devices detected (emulated)",
      };
    }

    const connectedDevices = this.emulatedDevices
      .filter((device) => device.connected)
      .map((device) => device.name);

    return {
      success: true,
      devices: connectedDevices,
      message: `Found ${connectedDevices.length} emulated DV device(s)`,
    };
  }

  /**
   * Start emulated capture process
   * Returns a mock ChildProcess that behaves like the real thing
   */
  async startCapture(outputPath: string): Promise<ChildProcess> {
    // Ensure output directory exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });

    // Return a mock child process that avoids Next.js bundling issues
    return new MockChildProcess(outputPath) as any as ChildProcess;
  }

  /**
   * Toggle device connection status (for testing)
   */
  toggleDevice(deviceId: string): boolean {
    const device = this.emulatedDevices.find((d) => d.id === deviceId);
    if (device) {
      device.connected = !device.connected;
      return device.connected;
    }
    return false;
  }

  /**
   * Add a new emulated device
   */
  addEmulatedDevice(name: string, type: "DV" | "HDV" = "DV"): string {
    const deviceId = `emu-${type.toLowerCase()}-${Date.now()}`;
    this.emulatedDevices.push({
      id: deviceId,
      name: `${name} (Emulated)`,
      type,
      connected: true,
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
