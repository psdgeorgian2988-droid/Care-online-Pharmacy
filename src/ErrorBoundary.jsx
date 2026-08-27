import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback || (
          <div className="page-error">
            <p className="home-kicker">MediHome</p>
            <h1>This page could not be opened</h1>
            <p>
              {this.state.error?.message ||
                "The screen failed to load. Open home to continue."}
            </p>
            <a href="#home">Open home</a>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
