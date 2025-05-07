package com.elvis.springboot.chat.app.messagues.response;

public class Response {

    private String message;
    private int statusCode;
    private Object data;

    public Response(int statusCode, String message, Object data) {
        this.message = message;
        this.statusCode = statusCode;
        this.data = data;
    }

    public Response(int statusCode, String message) {
        this.message = message;
        this.statusCode = statusCode;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public void setStatusCode(int statusCode) {
        this.statusCode = statusCode;
    }

    public Object getData() {
        return data;
    }

    public void setData(Object data) {
        this.data = data;
    }
    
}
