'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const ParticleCanvas = dynamic(
  () => import('./ParticleCanvas'),
  { ssr: false }
);

export default function ClientParticleCanvas() {
  return <ParticleCanvas />;
}
