import React from "react";
import ReactDOM from "react-dom/client";
import "../fonts.css";
import "../styles.css";
import "../storyboard.css";
import "../mobile.css";
import "./compat.css";
import App from "../App";
import { initializeStorage } from "./storage";

// 在首帧读取平台缓存，避免先呈现空书架再覆盖进度。
void initializeStorage().then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><App /></React.StrictMode>);
});
