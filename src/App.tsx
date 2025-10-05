import { Routes, Route, Link } from "react-router-dom";
import "./App.css";
import EditorPage from "@/pages/EditorPage";

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<EditorPage />} />
        </Routes>
    );
}
