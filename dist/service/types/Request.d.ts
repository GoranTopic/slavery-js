type Request = {
    type: 'run' | 'exec';
    method: string;
    parameters: any;
    selector?: string;
    completed: boolean;
    result: any;
};

export type { Request as default };
