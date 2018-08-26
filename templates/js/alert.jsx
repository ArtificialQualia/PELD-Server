import React from "react";
import { socket } from "./index";

class ErrorBox extends React.Component {
    constructor(props){
        super(props);
        this.alertRef = React.createRef();
        this.boxType = "alert-warning";
        this.message = "Error:"
        if (this.props.info) {
            this.boxType = "alert-secondary"
            this.message = "Info:"
        }
        if (this.props.exception) {
            this.boxType = "alert-danger"
            this.message = "Fatal Error:"
        }
    }

    componentDidMount() {
        if (!this.props.exception) {
          setTimeout(this.closeAlert.bind(this), 5000);
        }
    }

    closeAlert() {
        this.alertRef.current.click();
    }

    render() {
        return (
            <div className={"alert "+this.boxType+" alert-dismissible fade w-50 mx-auto show"} style={{pointerEvents: 'all'}} role="alert">
                <strong>{this.message}</strong> {this.props.message}{this.props.exception ? <span><br /><br />Refresh this page to continue</span> : ""}
                <button ref={this.alertRef} type="button" className="close" data-dismiss="alert">
                    <span>&times;</span>
                </button>
            </div>
        );
    }
}

export default class Alert extends React.Component {
    constructor(props){
        super(props);
        this.state = {errors: []};
        this.count = 0;
        socket.on('error', (data) => {
            this.setState(function(prevState, props) {
                prevState.errors.push(<ErrorBox key={this.count} message={data} />)
                this.count += 1;
                return {errors: prevState.errors};
            });
        });
        socket.on('exception', (data) => {
            this.setState(function(prevState, props) {
                prevState.errors.push(<ErrorBox key={this.count} exception message={data} />)
                this.count += 1;
                return {errors: prevState.errors};
            });
        });
        socket.on('info', (data) => {
            this.setState(function(prevState, props) {
                prevState.errors.push(<ErrorBox key={this.count} info message={data} />)
                this.count += 1;
                return {errors: prevState.errors};
            });
        });
        socket.on('reconnect_error', (error) => {
          this.setState(function(prevState, props) {
              prevState.errors.push(<ErrorBox key={this.count} message="Error re-establishing socket connection, trying again..." />)
              this.count += 1;
              return {errors: prevState.errors};
          });
        });
        socket.on('reconnect', (attemptNumber) => {
          this.setState(function(prevState, props) {
              prevState.errors.push(<ErrorBox key={this.count} info message="Connection re-established." />)
              this.count += 1;
              return {errors: prevState.errors};
          });
        });
    }

    render() {
        return (
            <div>
                {this.state.errors}
            </div>
        );
    }
}