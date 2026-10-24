import React from 'react';
import AuthPortal from './AuthPortal';

export default function AdminLogin({ onLoginSuccess, onCancel }) {
  return (
    <AuthPortal 
      onLoginSuccess={onLoginSuccess}
      onCancel={onCancel}
      initialTab="login"
    />
  );
}
