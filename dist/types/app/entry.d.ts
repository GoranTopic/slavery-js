type EntryOptions = {
    host: string;
    port: number;
};
declare const entry: (entryOptions: EntryOptions) => ProxyConstructor;
export default entry;
