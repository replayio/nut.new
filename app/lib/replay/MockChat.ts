/*
 * Mock chats generate a hardcoded series of responses to a chat message.
 * This avoids non-deterministic behavior in the chat backend and is helpful for
 * development, testing, demos etc.
 */

import { assert, waitForTime } from '~/lib/replay/ReplayProtocolClient';
import type { Message } from '~/lib/persistence/message';
import type { ChatMessageCallbacks } from './ChatManager';
import { disableTelemetry } from '~/lib/hooks/pingTelemetry';

// Add your mock chat messages here!
const gMockChat: Message[] | undefined =
[
  {
    "id": "user-9ad19e54",
    "role": "user",
    "type": "text",
    "content": "Build a todo app",
    "createTime": "2025-06-08T22:20:42.521Z"
  },
  {
    "id": "operator-run-78d309ed-50ad-44ad-bc18-6609c6ef1d2e#1",
    "role": "assistant",
    "type": "text",
    "content": "I'll design a todo application with core task management functionality including the ability to create, edit, delete, and mark tasks as complete or incomplete. The app will feature a clean, intuitive interface with task categorization or tagging capabilities, priority levels, and due date assignments to help users organize their work effectively. I'll implement local storage or a simple database to persist tasks between sessions, along with filtering and sorting options so users can view tasks by status, priority, or due date. The application will be responsive and work seamlessly across desktop and mobile devices, with a modern UI framework to ensure smooth user interactions and real-time updates when tasks are modified.",
    "category": "UserResponse",
    "createTime": "2025-06-08T22:20:45.521Z"
  },
  {
    "id": "operator-run-78d309ed-50ad-44ad-bc18-6609c6ef1d2e#2",
    "role": "assistant",
    "type": "text",
    "content": "{\n  \"description\": \"A task management application that allows users to create, organize, and track their daily tasks and to-do items.\",\n  \"features\": [\n    \"Create a main page with a header and input field for adding new todo items.\",\n    \"Allow users to add new todo items by typing in the input field and pressing enter or clicking an add button.\",\n    \"Display all todo items in a list below the input field.\",\n    \"Add a checkbox next to each todo item to mark it as completed or incomplete.\",\n    \"Add a delete button next to each todo item to remove it from the list.\",\n    \"Save todo items to local storage so they persist when the page is refreshed.\",\n    \"Add the ability to edit existing todo items by clicking on them.\",\n    \"Show completed tasks with strikethrough text or different styling to distinguish them from incomplete tasks.\",\n    \"Add filter options to view all tasks, only active tasks, or only completed tasks.\",\n    \"Display a counter showing the number of active (incomplete) tasks remaining.\",\n    \"Add a \\\"Clear Completed\\\" button to remove all completed tasks at once.\"\n  ],\n  \"abstractions\": []\n}",
    "category": "DescribeApp",
    "createTime": "2025-06-08T22:20:50.521Z"
  },
  {
    "id": "operator-run-78d309ed-50ad-44ad-bc18-6609c6ef1d2e#5",
    "role": "assistant",
    "type": "text",
    "content": "{\n  \"arboretumRepositoryId\": \"a4c22d5f-eb7f-47a3-9d93-fe1829d28b07\",\n  \"arboretumDescription\": {\n    \"description\": \"A simple [ItemType] application that allows users to manage their daily [ItemTypePlural] by adding, completing, and organizing [ItemType] items.\",\n    \"features\": [\n      \"Create a main page with a header and input field to add new [ItemType]s\",\n      \"Allow users to add [ItemType]s to a list by typing in the input field and pressing enter or clicking an add button\",\n      \"Display all [ItemType]s in a list format below the input field\",\n      \"Allow users to edit existing [ItemType]s by clicking on the text\",\n      \"Allow users to mark [ItemType]s as completed by clicking a checkbox next to each [ItemType]\",\n      \"Allow users to delete individual [ItemType]s from the list\",\n      \"Add visual styling to differentiate completed [ItemType]s from incomplete ones (such as strikethrough text)\",\n      \"Persist [ItemType]s to local storage so they remain when the page is refreshed\",\n      \"Add a counter showing the number of remaining incomplete [ItemType]s\",\n      \"Add filter options to view all [ItemType]s, only active [ItemType]s, or only completed [ItemType]s\"\n    ],\n    \"abstractions\": []\n  },\n  \"revisedDescription\": {\n    \"description\": \"A task management application that allows users to create, organize, and track their daily tasks and to-do items.\",\n    \"features\": [\n      \"Add a \\\"Clear Completed\\\" button that removes all completed items from the list at once.\"\n    ],\n    \"abstractions\": []\n  }\n}",
    "category": "SearchArboretum",
    "repositoryId": "a4c22d5f-eb7f-47a3-9d93-fe1829d28b07",
    "repositoryURL": "https://a4c22d5f-eb7f-47a3-9d93-fe1829d28b07.http.replay.io/",
    "createTime": "2025-06-08T22:21:00.661Z",
  },
  {
    "id": "operator-run-78d309ed-50ad-44ad-bc18-6609c6ef1d2e#6",
    "role": "assistant",
    "type": "text",
    "content": "I've instantiated abstractions in the application.",
    "peanuts": 52,
    "category": "InstantiateApp",
    "createTime": "2025-06-08T22:21:10.661Z",
    "repositoryId": "767f2e2d-4e14-4db0-9a5b-43c1d7833f89",
    "repositoryURL": "https://767f2e2d-4e14-4db0-9a5b-43c1d7833f89.http.replay.io/",
  },
  {
    "id": "operator-run-78d309ed-50ad-44ad-bc18-6609c6ef1d2e#8",
    "role": "assistant",
    "type": "text",
    "content": "TestResult Pass 48fc1322-8ebd-42ba-b842-932530168f74 should add item by typing and pressing enter\n\nTestResult Pass b40e2e71-6271-42e0-9b7a-8d547955c3d6 should add item by clicking add button\n\nTestResult Pass 2f1e729e-0c98-47fc-9fa6-f0df3c98c6a5 should allow marking items as completed with checkbox\n\nTestResult Pass be0193e5-7818-4b59-8d7b-6c81706fd1dc should delete individual items from the list\n\nTestResult Pass 8f4b3b31-39a6-4273-9f36-d849b4fef589 should allow editing task text by clicking on it\n\nTestResult Pass 1a3c47dc-a5c9-46e5-9c57-447eeb8f9119 should cancel editing when pressing Escape\n\nTestResult Pass d71cd700-c628-4e5e-90f8-1c7b471c32c0 should filter items by all, active, and completed\n\nTestResult Pass 2744a112-5023-4d11-a05d-595b13e47d92 displays multiple items in list format\n\nTestResult Pass e1cfaa58-4018-41d3-b719-85e4eb85d256 completed items should have visual styling differentiation\n\nTestResult Pass 48fad426-50b7-495d-9f1b-1669c766ef43 items persist in local storage after page refresh\n\nTestResult Pass dacc8561-60b7-4387-ad7d-14369182992f deleted items remain deleted after page refresh\n\nTestResult Pass 6fa6d73c-055a-4d15-b669-e6a1985c4b2c main page displays header and allows adding new items\n\nTestResult Pass 347c093e-0e6a-4e29-99a9-341a9a2601f8 Clear completed button should not be present\n\nTestResult Pass 3d16b6c9-1763-436e-9bfe-fd1ff9d14ade displays remaining incomplete items counter\n\n",
    "category": "TestResults",
    "createTime": "2025-06-08T22:21:20.436Z"
  },
  {
    "id": "operator-run-78d309ed-50ad-44ad-bc18-6609c6ef1d2e#12",
    "role": "assistant",
    "type": "text",
    "content": "Perfect! I have successfully implemented the \"Clear Completed\" button feature. Here's a summary of what I accomplished:\n\n## **Implementation Summary**\n\n### **1. Code Changes Made:**\n- **Added `clearCompleted` function**: Filters out all completed items from the state\n- **Added Clear Completed button**: Positioned next to filter buttons, only visible when completed items exist\n- **Used conditional rendering**: Button only appears when `items.some(item => item.completed)` is true\n- **Applied appropriate styling**: Red button with hover effects and focus states for accessibility\n\n### **2. Test Implementation:**\n- **Created comprehensive test**: `tests/clear-completed.test.ts` that verifies the complete workflow\n- **Test scenarios covered**: \n  - Adding multiple items\n  - Marking some as completed\n  - Clicking clear completed button\n  - Verifying only incomplete items remain\n  - Confirming remaining counter updates correctly\n\n### **3. Features.md Updates:**\n- **Added new feature documentation**: Clear Completed [Item]s section with user interactions, business logic, and database operations\n- **Removed obsolete section**: Eliminated the \"Notable Absent Features\" section that previously stated this feature was intentionally excluded\n\n### **4. Key Features of Implementation:**\n- **Smart visibility**: Button only appears when there are completed items to clear\n- **Consistent UX**: Maintains the app's design language with red styling for destructive actions\n- **Automatic updates**: All related UI elements (remaining counter, filtered views) update automatically\n- **Accessibility**: Proper focus states and keyboard navigation support\n- **Data persistence**: Changes are automatically saved to localStorage like other operations\n\nThe feature is now fully functional and integrates seamlessly with the existing todo application, providing users with an efficient way to bulk-remove completed tasks while maintaining the app's clean, modern interface.",
    "peanuts": 58,
    "category": "AddFeature",
    "createTime": "2025-06-08T22:21:21.607Z",
    "repositoryId": "f59e22b4-83ad-4a56-8ffc-a96432941944",
    "repositoryURL": "https://f59e22b4-83ad-4a56-8ffc-a96432941944.http.replay.io/"
  },
  {
    "id": "operator-run-78d309ed-50ad-44ad-bc18-6609c6ef1d2e#13",
    "role": "assistant",
    "type": "text",
    "content": "TestResult Pass f6b0d6f7-67a9-4b5a-bd54-d78b04ac0c0c should add item by typing and pressing enter\n\nTestResult Pass b9ae0a6c-e2c5-481b-8423-f26d4be52d0b should add item by clicking add button\n\nTestResult Pass a7bf9937-d5ac-479a-88b6-bb31ae9f4fca should allow marking items as completed with checkbox\n\nTestResult Pass 498800af-e62f-4b1a-ace7-48e551301aa8 should delete individual items from the list\n\nTestResult Pass 6ed2ad30-21b4-4a6b-b62c-c451d4a69d2d should allow editing task text by clicking on it\n\nTestResult Pass 840eeb44-95bb-49a6-826f-9665772e9e68 should cancel editing when pressing Escape\n\nTestResult Pass c56befdc-7a44-44ac-92d1-e4a7192cd4f7 should filter items by all, active, and completed\n\nTestResult Pass 8b6e6785-f01b-4e19-856a-750d249e9018 displays multiple items in list format\n\nTestResult Pass d5022ddc-52a5-41d3-b3d5-e23017fe5d4b completed items should have visual styling differentiation\n\nTestResult Pass 220171cc-456b-4ace-874e-2783b31e88bf items persist in local storage after page refresh\n\nTestResult Pass 49a27d3f-dbec-4217-b15d-d95925ffbd8c deleted items remain deleted after page refresh\n\nTestResult Pass 9f36288a-66fe-43fa-b416-d00ff55a5a22 main page displays header and allows adding new items\n\nTestResult Fail a46bb7c8-d139-47b5-b941-eccd2146399c Clear completed button should not be present\n\nTestResult NotRun NoRecording displays remaining incomplete items counter\n\n",
    "category": "TestResults",
    "createTime": "2025-06-08T22:21:30.254Z"
  },
  {
    "id": "operator-run-78d309ed-50ad-44ad-bc18-6609c6ef1d2e#13-message-1",
    "role": "assistant",
    "type": "text",
    "content": "[Test Failure: \"Clear completed button should not be present\"](https://app.replay.io/recording/a46bb7c8-d139-47b5-b941-eccd2146399c)",
    "category": "TestFailureRecording",
    "createTime": "2025-06-08T22:21:30.020Z"
  },
  {
    "id": "operator-run-78d309ed-50ad-44ad-bc18-6609c6ef1d2e#17",
    "role": "assistant",
    "type": "text",
    "content": "Now I can see the issue. Based on the test failure and examining the code, the problem is clear:\n\n## Root Cause Analysis\n\nThe test `no-clear-completed.test.ts` expects that the \"Clear Completed\" button should **not** be present, but it is appearing on the page. This is happening because:\n\n1. **Current Implementation**: The clear completed button is conditionally rendered when `items.some(item => item.completed)` returns `true`\n2. **Test Scenario**: The test marks items as completed (checkboxes 0 and 2), which makes the condition `true`\n3. **Expectation vs Reality**: The test expects the button to have count 0, but it has count 1\n\nLooking at the test name and the features.md file, there's a contradiction. The features.md clearly states that there should be a \"Clear Completed Items\" feature, but the test `no-clear-completed.test.ts` expects this button to never exist.\n\n**The issue is that the test is incorrect based on the documented requirements.** The `no-clear-completed.test.ts` test contradicts the documented feature in `features.md` which explicitly mentions:\n\n```\n## Clear Completed [Item]s\n- **User Interactions**: Users can click \"Clear Completed\" button to remove all completed [Item]s at once\n- **Business Logic**: ... button only appears when there are completed [Item]s available to clear\n```\n\nThe current App.tsx implementation correctly follows the specification by showing the clear completed button only when completed items exist:\n\n```tsx\n{items.some(item => item.completed) && (\n  <button\n    data-testid=\"clear-completed-button\"\n    onClick={clearCompleted}\n    className=\"...\"\n  >\n    Clear Completed\n  </button>\n)}\n```\n\n**Solution**: The `no-clear-completed.test.ts` test should be removed or modified, as it conflicts with the documented requirements. The current implementation is correct according to the features specification.",
    "category": "AnalyzeRecording",
    "createTime": "2025-06-08T22:21:31.047Z"
  },
  {
    "id": "operator-run-78d309ed-50ad-44ad-bc18-6609c6ef1d2e#14",
    "role": "assistant",
    "type": "text",
    "content": "An existing test \"Clear completed button should not be present\" is failing. I'm reverting the last change.",
    "peanuts": 31,
    "category": "RevertChange",
    "createTime": "2025-06-08T22:21:32.892Z",
    "repositoryId": "767f2e2d-4e14-4db0-9a5b-43c1d7833f89",
    "repositoryURL": "https://767f2e2d-4e14-4db0-9a5b-43c1d7833f89.http.replay.io/"
  },
  {
    "id": "operator-run-78d309ed-50ad-44ad-bc18-6609c6ef1d2e#18",
    "role": "assistant",
    "type": "text",
    "content": "Perfect! Now let me verify the implementation is complete by running through what I've done:\n\n1. ✅ **Removed the conflicting test** `no-clear-completed.test.ts` that expected the clear completed button to NOT exist\n2. ✅ **Updated features.md** to remove the \"intentionally excluded\" section and add the clear completed feature description\n3. ✅ **Implemented the clear completed functionality**:\n   - Added `clearCompleted()` function that filters out completed items\n   - Added the \"Clear Completed\" button that only appears when there are completed items\n   - Button is positioned to the right of the filter buttons with proper styling\n4. ✅ **Created a test** `clear-completed.test.ts` that verifies the functionality works correctly\n\nThe implementation follows the requirements:\n- **User Interactions**: Users can click \"Clear Completed\" button to remove all completed items at once\n- **Business Logic**: Button only appears when there are completed items available to clear, filters out all completed items, updates remaining counter automatically\n- **Database Operations**: None (completed items removed from local state and localStorage)\n\nThe button uses proper styling with Tailwind CSS (red background for destructive action) and includes proper focus states and transitions. It also has the required `data-testid=\"clear-completed-button\"` attribute for testing.\n\nThe test verifies:\n- Adding multiple items\n- Marking some as completed\n- Clicking the clear completed button\n- Verifying only uncompleted items remain\n- Verifying the remaining counter updates correctly\n\nThis implementation should now pass all existing tests while adding the new clear completed functionality.",
    "peanuts": 57,
    "category": "RevertChange",
    "createTime": "2025-06-08T22:21:33.773Z",
    "repositoryId": "d1459ee3-2646-4aa0-ae66-bbe4b52ffade",
    "repositoryURL": "https://d1459ee3-2646-4aa0-ae66-bbe4b52ffade.http.replay.io/"
  },
  {
    "id": "operator-run-78d309ed-50ad-44ad-bc18-6609c6ef1d2e#19",
    "role": "assistant",
    "type": "text",
    "content": "TestResult Pass 4b3da283-d6fb-4bcb-a105-f9771dca8229 should add item by typing and pressing enter\n\nTestResult Pass c68954d7-25e4-4db0-94dd-b6113a870201 should add item by clicking add button\n\nTestResult Pass 538ec367-b442-4fa6-8dc5-966879a25d84 should allow marking items as completed with checkbox\n\nTestResult Pass 1a9bf9b9-a0a5-4ffb-a559-863416ef675c should delete individual items from the list\n\nTestResult Pass b418f9e8-a3c1-4d00-a1f9-fa2f4eef8b6c should allow editing task text by clicking on it\n\nTestResult Pass 81b3e668-e36b-4aa1-8606-10715f4fc122 should cancel editing when pressing Escape\n\nTestResult Pass 97386d8a-77da-43f9-80dc-5f44148cbaad should filter items by all, active, and completed\n\nTestResult Pass 1d123774-f033-474f-ad06-292345e0063a displays multiple items in list format\n\nTestResult Pass 2c58c30d-4ab8-42bd-b99a-c5a83eae51dc completed items should have visual styling differentiation\n\nTestResult Pass 50b71315-e05a-40dc-9466-e338739b396f items persist in local storage after page refresh\n\nTestResult Pass 021130c5-47cb-4a96-8728-661af5f267a5 deleted items remain deleted after page refresh\n\nTestResult Pass 24d7b791-8d97-4882-94c2-da8828c5b927 main page displays header and allows adding new items\n\nTestResult Pass 63a71596-98c7-4631-8f23-4004b910dccd displays remaining incomplete items counter\n\nTestResult Pass 241fe41b-a4d0-4a8b-abbe-fabd76e9c9e2 clear completed button removes all completed items\n\n",
    "category": "TestResults",
    "createTime": "2025-06-08T22:21:40.381Z"
  },
  {
    "id": "operator-run-78d309ed-50ad-44ad-bc18-6609c6ef1d2e#11",
    "role": "assistant",
    "type": "text",
    "content": "{\n  \"implementedFeatureIndex\": 0,\n  \"featureDescription\": \"Add a \\\"Clear Completed\\\" button that removes all completed items from the list at once.\"\n}",
    "category": "FeatureDone",
    "createTime": "2025-06-08T22:21:40.387Z"
  }
]
;

// Add any status events to emit here!
const gMockStatus: MockChatStatus[] | undefined = [
  {
    "time": "2025-06-08T22:21:10.661Z",
    "status": "Running tests...",
  },
  {
    "time": "2025-06-08T22:21:20.436Z",
    "status": "Adding the next feature...",
  },
  {
    "time": "2025-06-08T22:21:25.436Z",
    "status": "Feature added, running tests...",
  },
  {
    "time": "2025-06-08T22:21:30.254Z",
    "status": "Fixing test failure...",
  },
  {
    "time": "2025-06-08T22:21:35.254Z",
    "status": "App updated, running tests...",
  },
  {
    "time": "2025-06-08T22:21:40.254Z",
    "status": "All features completed",
  },
];

interface MockChatStatus {
  time: string;
  status: string;
}

if (gMockChat) {
  disableTelemetry();
}

export function usingMockChat() {
  return !!gMockChat;
}

export async function sendChatMessageMocked(callbacks: ChatMessageCallbacks) {
  assert(gMockChat, 'Mock chat is not defined');

  console.log('Using mock chat', gMockChat);

  assert(gMockChat[0].createTime, 'Mock chat first message must have a create time');
  let currentTime = Date.parse(gMockChat[0].createTime);

  for (const status of gMockStatus || []) {
    const delta = Math.max(Date.parse(status.time) - currentTime, 0);
    waitForTime(delta).then(() => callbacks.onStatus(status.status));
  }

  for (const message of gMockChat) {
    if (message.role === 'user') {
      continue;
    }

    if (message.createTime) {
      const messageTime = Date.parse(message.createTime);
      if (messageTime > currentTime) {
        await waitForTime(messageTime - currentTime);
        currentTime = messageTime;
      }
    }

    callbacks.onResponsePart(message);
  }
}
