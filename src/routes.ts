import { createBrowserRouter } from "react-router";
import MainLayout from "./components/MainLayout";
import PipelineView from "./components/PipelineView";
import ChatView from "./components/ChatView";

export const router = createBrowserRouter([
    {
        path: "/",
        Component: MainLayout,
        children: [
            { index: true, Component: ChatView },
            { path: "pipeline", Component: PipelineView },
            { path: "*", Component: ChatView },
        ],
    },
]);
