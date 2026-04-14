import React from 'react';
import Link from 'next/link';

export default function Unauthorized() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-clara-neutral-bg text-clara-green-900 p-4">
      <h1 className="text-3xl font-serif font-bold mb-4">Sign in required</h1>
      <p className="text-lg text-clara-neutral-muted mb-6">
        You need to be signed in as a caregiver to access this area.
      </p>
      <Link href="/signin" className="px-6 py-3 bg-clara-green-800 text-white rounded-full font-bold hover:bg-clara-green-900 transition-colors">
        Go to Sign In
      </Link>
    </div>
  );
}
