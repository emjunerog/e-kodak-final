import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * AdminWorkstation
 * ----------------
 * Deprecated component. Workstation Hub has been removed and replaced by
 * the executive Activity Logs dashboard under Studio Management.
 */
export default function AdminWorkstation() {
  return <Navigate to="/admin/activity-logs" replace />;
}
