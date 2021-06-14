export type DiffConfig = {
    sourcePath: string;
    comparePath: string;
    server?: {
        url: string;
        apiKey: string;
        documents: { id: string; pdfId: string; name?: string }[];
    };
};

export type ChiliTask = {
    task: {
        attr_finished: "True" | "False";
        attr_succeeded: "True" | "False";
        attr_hasDependantTasks: "False";
        attr_id: string;
        attr_result: string;
        attr_errorMessage: string;
    };
};
