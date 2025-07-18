import type { Message } from '~/lib/persistence/message';
import { assert } from '~/lib/replay/ReplayProtocolClient';

function mergeResponseMessage(msg: Message, messages: Message[]): Message[] {
  const lastMessage = messages[messages.length - 1];
  if (lastMessage.id == msg.id) {
    messages.pop();
    assert(lastMessage.type == 'text', 'Last message must be a text message');
    assert(msg.type == 'text', 'Message must be a text message');
    messages.push({
      ...msg,
      content: lastMessage.content + msg.content,
    });
  } else {
    messages.push(msg);
  }
  return messages;
}

export default mergeResponseMessage;
