/**
 * Lync Attribution Web SDK
 * 
 * Cross-platform attribution tracking for web applications.
 * Matches user journeys between web clicks and mobile app events.
 * 
 * Usage:
 * 1. Initialize with your API URL and entity ID
 * 2. Call trackClick() on link clicks
 * 3. Call trackConversion() on important actions
 * 4. Use generateFingerprint() for device matching
 */

import packageJson from '../package.json';

export interface LyncConfig {
  apiBaseURL: string;
  apiKey?: string;
  debug?: boolean;
}

export interface DeviceFingerprint {
  screen: string;           // "1920x1080"
  scale: string;            // "2.0"
  platform: string;        // "web"
  device: string;           // "desktop|mobile|tablet"
  timezone: string;         // "America_New_York"
  language: string;         // "en"
  region: string;           // "US"
  userAgent: string;        // Browser info
}

export interface TrackingData {
  clickId?: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  customerAvatar?: string;
  customProperties?: Record<string, any>;
}

export class Lync {
  private config: LyncConfig;
  private fingerprint: DeviceFingerprint;

  constructor(config: LyncConfig) {
    this.config = config;
    this.fingerprint = this.generateDeviceFingerprint();
    
    if (config.debug) {
      console.log('🌐 Lync Web SDK initialized');
      console.log('📍 API URL:', config.apiBaseURL);
      console.log('🔍 Device Fingerprint:', this.generateWebCompatibleFingerprint());
    }
  }

  /**
   * Track a link click for attribution
   */
  async trackClick(
    linkId: string,
    data: TrackingData = {}
  ): Promise<{ success: boolean; clickId: string }> {
    const clickId = data.clickId || this.generateClickId();
    
    const payload: any = {
      event_type: 'click',
      event_name: 'Link Click',
      tracking_type: 'link',
      link_id: linkId,
      click_id: clickId,
      timestamp: new Date().toISOString(),
      device_info: {
        platform: 'web',
        device_type: this.fingerprint.device,
        screen_width: parseInt(this.fingerprint.screen.split('x')[0]),
        screen_height: parseInt(this.fingerprint.screen.split('x')[1]),
        timezone: this.fingerprint.timezone,
        language: this.fingerprint.language,
        user_agent: this.fingerprint.userAgent,
        device_fingerprint: this.generateWebCompatibleFingerprint(),
        screen_fingerprint: this.generateScreenFingerprint(),
        web_compatible_fingerprint: this.generateWebCompatibleFingerprint()
      },
      properties: {
        ...data.customProperties,
        device_fingerprint: this.generateWebCompatibleFingerprint()
      }
    };

    // Add customer information if provided
    if (data.customerId) payload.customer_id = data.customerId;
    if (data.customerEmail) payload.customer_email = data.customerEmail;
    if (data.customerName) payload.customer_name = data.customerName;
    if (data.customerAvatar) payload.customer_avatar = data.customerAvatar;

    try {
      const response = await this.sendRequest('/api/track', payload);
      
      if (this.config.debug) {
        console.log('✅ Click tracked:', clickId);
      }
      
      // Store click_id for potential app handoff
      this.storeClickId(clickId);
      
      return { success: true, clickId };
    } catch (error) {
      if (this.config.debug) {
        console.error('❌ Click tracking failed:', error);
      }
      return { success: false, clickId };
    }
  }

  /**
   * Track a conversion event
   */
  async trackConversion(
    eventName: string,
    data: TrackingData = {}
  ): Promise<{ success: boolean }> {
    const payload: any = {
      event_type: 'conversion',
      event_name: eventName,
      tracking_type: 'general',
      timestamp: new Date().toISOString(),
      device_info: {
        platform: 'web',
        device_type: this.fingerprint.device,
        screen_width: parseInt(this.fingerprint.screen.split('x')[0]),
        screen_height: parseInt(this.fingerprint.screen.split('x')[1]),
        timezone: this.fingerprint.timezone,
        language: this.fingerprint.language,
        user_agent: this.fingerprint.userAgent
      },
      properties: {
        ...data.customProperties,
        device_fingerprint: this.generateWebCompatibleFingerprint()
      }
    };

    // Add optional fields if provided
    if (data.clickId || this.getStoredClickId()) {
      payload.click_id = data.clickId || this.getStoredClickId();
    }
    if (data.customerId) payload.customer_id = data.customerId;
    if (data.customerEmail) payload.customer_email = data.customerEmail;
    if (data.customerName) payload.customer_name = data.customerName;
    if (data.customerAvatar) payload.customer_avatar = data.customerAvatar;

    try {
      await this.sendRequest('/api/track', payload);
      
      if (this.config.debug) {
        console.log('✅ Conversion tracked:', eventName);
      }
      
      return { success: true };
    } catch (error) {
      if (this.config.debug) {
        console.error('❌ Conversion tracking failed:', error);
      }
      return { success: false };
    }
  }

  /**
   * Track a custom event with full customer information support
   */
  async trackEvent(
    eventType: string,
    eventName: string,
    data: TrackingData = {}
  ): Promise<{ success: boolean }> {
    const payload: any = {
      event_type: eventType,
      event_name: eventName,
      tracking_type: 'custom',
      timestamp: new Date().toISOString(),
      device_info: {
        platform: 'web',
        device_type: this.fingerprint.device,
        screen_width: parseInt(this.fingerprint.screen.split('x')[0]),
        screen_height: parseInt(this.fingerprint.screen.split('x')[1]),
        timezone: this.fingerprint.timezone,
        language: this.fingerprint.language,
        user_agent: this.fingerprint.userAgent
      },
      properties: {
        ...data.customProperties,
        device_fingerprint: this.generateWebCompatibleFingerprint()
      }
    };

    // Add optional fields if provided
    if (data.clickId || this.getStoredClickId()) {
      payload.click_id = data.clickId || this.getStoredClickId();
    }
    if (data.customerId) payload.customer_id = data.customerId;
    if (data.customerEmail) payload.customer_email = data.customerEmail;
    if (data.customerName) payload.customer_name = data.customerName;
    if (data.customerAvatar) payload.customer_avatar = data.customerAvatar;

    try {
      await this.sendRequest('/api/track', payload);
      
      if (this.config.debug) {
        console.log('✅ Custom event tracked:', eventName);
      }
      
      return { success: true };
    } catch (error) {
      if (this.config.debug) {
        console.error('❌ Custom event tracking failed:', error);
      }
      return { success: false };
    }
  }

  /**
   * Generate device fingerprint for cross-platform matching
   */
  generateWebCompatibleFingerprint(): string {
    const data = [
      `device:${this.fingerprint.device}`,
      `lang:${this.fingerprint.language}`,
      `platform:web`,
      `region:${this.fingerprint.region}`,
      `scale:${this.fingerprint.scale}`,
      `screen:${this.fingerprint.screen}`,
      `tz:${this.fingerprint.timezone}`
    ];
    
    return data.join(";");
  }

  /**
   * Generate screen-specific fingerprint
   */
  private generateScreenFingerprint(): string {
    const screen = window.screen;
    
    const screenData = [
      `resolution:${screen.width * devicePixelRatio}x${screen.height * devicePixelRatio}`,
      `scale:${devicePixelRatio}`,
      `colorDepth:${screen.colorDepth}`,
      `orientation:${screen.orientation?.type || 'unknown'}`,
      `viewport:${window.innerWidth}x${window.innerHeight}`
    ];
    
    return screenData.join("|");
  }

  /**
   * Generate comprehensive device fingerprint
   */
  private generateDeviceFingerprint(): DeviceFingerprint {
    const screen = window.screen;
    const nav = navigator;
    const locale = new Intl.DateTimeFormat().resolvedOptions();
    
    // Detect device type
    const deviceType = this.detectDeviceType();
    
    return {
      screen: `${screen.width * devicePixelRatio}x${screen.height * devicePixelRatio}`,
      scale: devicePixelRatio.toString(),
      platform: 'web',
      device: deviceType,
      timezone: locale.timeZone.replace(/\//g, '_'),
      language: nav.language.split('-')[0],
      region: nav.language.split('-')[1] || locale.locale?.split('-')[1] || 'US',
      userAgent: nav.userAgent
    };
  }

  /**
   * Detect device type from user agent and screen size
   */
  private detectDeviceType(): string {
    const ua = navigator.userAgent.toLowerCase();
    const width = window.screen.width;
    
    if (/mobile|android|iphone/.test(ua)) {
      return 'mobile';
    } else if (/tablet|ipad/.test(ua) || (width >= 768 && width <= 1024)) {
      return 'tablet';
    } else {
      return 'desktop';
    }
  }

  /**
   * Generate unique click ID
   */
  private generateClickId(): string {
    return `click_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Store click ID for attribution
   */
  private storeClickId(clickId: string): void {
    try {
      localStorage.setItem('lync_click_id', clickId);
      localStorage.setItem('lync_click_timestamp', Date.now().toString());
    } catch (e) {
      // Fallback to sessionStorage or ignore
      try {
        sessionStorage.setItem('lync_click_id', clickId);
      } catch (e) {
        // Silent fail for privacy browsers
      }
    }
  }

  /**
   * Get stored click ID
   */
  private getStoredClickId(): string | null {
    try {
      return localStorage.getItem('lync_click_id') || sessionStorage.getItem('lync_click_id');
    } catch (e) {
      return null;
    }
  }

  /**
   * Send request to Lync API
   */
  private async sendRequest(endpoint: string, payload: any): Promise<any> {
    const url = `${this.config.apiBaseURL}${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': `${packageJson.name}/${packageJson.version}`
    };
    
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    return response.json();
  }
}

// Static convenience methods for Web SDK
export namespace Lync {
  /**
   * Initialize Lync Attribution
   */
  export function init(config: LyncConfig): Lync {
    return new Lync(config);
  }

  /**
   * Generate device fingerprint without initializing
   */
  export function generateFingerprint(): string {
    const temp = new Lync({
      apiBaseURL: ''
    });
    return temp.generateWebCompatibleFingerprint();
  }
}

// All exports are named exports: Lync (class), Lync (static methods) 