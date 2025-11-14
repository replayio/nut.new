// Describes all the reference apps that can be used for customization
// during app building.

enum ReferenceAppCategory {
  Business = 'Business',
  Technical = 'Technical',
  Personal = 'Personal',
}

interface ReferenceApp {
  appId?: string;
  appName: string;
  description: string;
  bulletPoints?: string[];
  photo?: string;
  categories: ReferenceAppCategory[];
}

export const referenceApps: ReferenceApp[] = [
  {
    appId: '9367f079-1026-4c76-b583-91bb59aaac17',
    appName: 'Issue Tracker',
    description: 'Track and manage issues across your projects',
    bulletPoints: ['Triage System', 'Personal Inboxes', 'Email Notifications'],
    photo: 'https://picsum.photos/800/450',
    categories: [ReferenceAppCategory.Business, ReferenceAppCategory.Technical],
  },
  {
    appId: '9c41cf6c-e87a-4233-86a9-f862377c726e',
    appName: 'Team Wiki',
    description: 'Share and track your knowledge base and documents',
    bulletPoints: ['Rich Documents', 'Comment System', 'Email Notifications'],
    photo: 'https://picsum.photos/800/450',
    categories: [ReferenceAppCategory.Business, ReferenceAppCategory.Personal],
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
