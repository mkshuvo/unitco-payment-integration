export {};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'unit-elements-white-label-app': {
        'jwt-token'?: string;
        'customer-token'?: string;
        theme?: string;
        language?: string;
        [key: string]: any;
      };
      'unit-elements-application-form': {
        'application-form-id': string;
        'application-form-token'?: string;
        'jwt-token'?: string; // alternative auth path
        theme?: string;
        language?: string;
        [key: string]: any;
      };
    }
  }

  // React 19 JSX typing augmentation
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'unit-elements-white-label-app': any;
        'unit-elements-application-form': any;
      }
    }
  }
}
