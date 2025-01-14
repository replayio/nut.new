// Define the ChatStreamController class for writing messages to a readable
// stream which will be decoded by the react/ai Chat API. There does not seem
// to be functionality exported from the associated packages to do this so
// for now we do it manually after reverse engineering the protocol.

export interface ChatFileChange {
  filePath: string;
  contents: string;
}

export class ChatStreamController {
  private controller: ReadableStreamDefaultController;
  private encoder: TextEncoder;

  constructor(controller: ReadableStreamDefaultController) {
    this.controller = controller;
    this.encoder = new TextEncoder();
  }

  writeText(text: string) {
    const data = this.encoder.encode(`0:${JSON.stringify(text)}\n`);
    this.controller.enqueue(data);
  }

  writeFileChanges(title: string, fileChanges: ChatFileChange[]) {
    let text = `<boltArtifact title="${title}">`;
    for (const fileChange of fileChanges) {
      text += `<boltAction type="file" filePath="${fileChange.filePath}">${fileChange.contents}</boltAction>`;
    }
    text += "</boltArtifact>";
    this.writeText(text);
  }

  writeAnnotation(type: string, value: any) {
    const data = this.encoder.encode(`8:[{"type":"${type}","value":${JSON.stringify(value)}}]\n`);
    this.controller.enqueue(data);
  }

  writeUsage({ completionTokens, promptTokens }: { completionTokens: number, promptTokens: number }) {
    this.writeAnnotation("usage", { completionTokens, promptTokens, totalTokens: completionTokens + promptTokens });
  }
}
