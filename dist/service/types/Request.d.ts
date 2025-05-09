type Request = {
    id: number;
    type: 'run' | 'exec';
    method: string;
    parameters: any;
    selector?: string | undefined;
    completed: boolean;
    isProcessing: boolean;
    result: any;
    onComplete: () => any;
    startTime: number;
};

export type { Request as default };
