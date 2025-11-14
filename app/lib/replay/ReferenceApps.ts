// Describes all the reference apps that can be used for customization
// during app building.

enum ReferenceAppCategory {
  Business = 'Business',
  Technical = 'Technical',
  Personal = 'Personal',
}

interface ReferenceApp {
  appPath?: string;
  appName: string;
  description: string;
  bulletPoints?: string[];
  photo?: string;
  categories: ReferenceAppCategory[];
}

export const referenceApps: ReferenceApp[] = [
  {
    appPath: 'management/IssueTracker',
    appName: 'Issue Tracker',
    description: 'Track and manage issues across your projects',
    bulletPoints: ['Triage System', 'Personal Inboxes', 'Email Notifications'],
    photo: 'https://utfs.io/f/g4w5SXU7E8KdqUWQBDviRZOVD8n3oL79Tegv1adIFGkcmQ6H',
    categories: [ReferenceAppCategory.Business, ReferenceAppCategory.Technical],
  },
  {
    appPath: 'management/DocumentManager',
    appName: 'Team Wiki',
    description: 'Share and track your knowledge base and documents',
    bulletPoints: ['Rich Text Documents', 'Kanban Boards and Tables', 'Comment System'],
    photo: 'https://utfs.io/f/g4w5SXU7E8Kd65diTnZrn27SvXDfJANF0dzKcZECW1mhuabT',
    categories: [ReferenceAppCategory.Business],
  },
  {
    appName: 'Telemetry Board',
    description: 'Track and understand telemetry across your systems',
    bulletPoints: ['Custom Metrics', 'Email Alerts'],
    categories: [ReferenceAppCategory.Technical],
  },
  {
    appName: 'Support CRM',
    description: 'Manage your support team and customer requests',
    bulletPoints: ['Email Integration'],
    categories: [ReferenceAppCategory.Business],
  },
  {
    appName: 'Invoicerator',
    description: 'Track time and costs for you and your team and manage invoices',
    bulletPoints: ['PDF Invoicing'],
    categories: [ReferenceAppCategory.Business, ReferenceAppCategory.Personal],
  },
  {
    appName: 'Study Buddy',
    description: 'Generate study materials for any topic',
    bulletPoints: ['PDF Imports', 'AI Generated Flash Cards'],
    categories: [ReferenceAppCategory.Personal],
  },
  {
    appName: 'Meal Minder',
    description: 'Family meal planning and shared grocery lists',
    bulletPoints: ['Automatic Recipe Lookup'],
    categories: [ReferenceAppCategory.Personal],
  },
  {
    appName: 'Change Logger',
    description: 'Collect feedback and build a roadmap and change log for your customers',
    bulletPoints: ['Voting System', 'Email Broadcast'],
    categories: [ReferenceAppCategory.Technical],
  },
];
