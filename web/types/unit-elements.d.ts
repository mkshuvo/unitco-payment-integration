export {};

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'unit-elements-white-label-app': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'jwt-token'?: string;
        theme?: string;
        language?: string;
      };
      'unit-elements-application-form': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'application-form-id'?: string;
        'application-form-token'?: string;
        theme?: string;
        language?: string;
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
