import { Building, Landmark, ServerCog, Users, type LucideIcon } from 'lucide-react';
import type { ServiceCategory } from '@/data/mock-data';
import { healthDashboardData, systemSampleData } from '@/data/mock-data';
import type { Role } from '@/lib/auth/roles';

export interface RoleDashboardConfig {
  title: string;
  description: string;
  icon: LucideIcon;
  uploadLabel: string;
  templateHref: string;
  emptyHint: string;
  sample: ServiceCategory[];
}

/** Presentation settings for each role's dashboard. Parsing rules live in lib/uploads/profiles. */
export const ROLE_DASHBOARDS: Record<Role, RoleDashboardConfig> = {
  facility: {
    title: 'Facility Manager Dashboard',
    description: "Upload your facility's health data (ER wait times, bed occupancy, service counts) and track performance.",
    icon: Building,
    uploadLabel: 'Upload facility metrics (CSV or Excel)',
    templateHref: '/templates/facility-template.csv',
    emptyHint: "Upload your facility's data file, or load the sample dataset to explore the dashboard.",
    sample: healthDashboardData,
  },
  district: {
    title: 'District Officer Dashboard',
    description: 'Upload and validate data from facilities, monitor district-level performance, and compare facility metrics.',
    icon: Users,
    uploadLabel: 'Upload district data (CSV or Excel)',
    templateHref: '/templates/district-template.csv',
    emptyHint: 'Upload a district summary, facility aggregate or comparison file, or load the sample dataset.',
    sample: healthDashboardData,
  },
  state: {
    title: 'State Admin Dashboard',
    description: 'Oversee every district, analyse state-wide trends and review performance against targets.',
    icon: Landmark,
    uploadLabel: 'Upload state data (CSV or Excel)',
    templateHref: '/templates/state-template.csv',
    emptyHint: 'Upload state-level aggregates or district summaries, or load the sample dataset.',
    sample: healthDashboardData,
  },
  admin: {
    title: 'Website Manager Dashboard',
    description: 'Monitor technical system health: storage and backups, user access and configuration data.',
    icon: ServerCog,
    uploadLabel: 'Upload system data (CSV or Excel)',
    templateHref: '/templates/admin-template.csv',
    emptyHint: 'Upload system parameters, logs or configuration exports, or load the sample dataset.',
    sample: systemSampleData,
  },
};
