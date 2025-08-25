'use client';

import * as React from 'react';

export type UnitWhiteLabelProps = {
  jwtToken?: string;
  customerToken?: string;
  theme?: string;
  language?: string;
  [key: string]: any;
};

export default function UnitWhiteLabel({ jwtToken, customerToken, theme, language, ...rest }: UnitWhiteLabelProps) {
  return React.createElement('unit-elements-white-label-app', {
    'jwt-token': jwtToken,
    'customer-token': customerToken,
    theme,
    language,
    ...rest,
  });
}
