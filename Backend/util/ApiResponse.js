class ApiResponse {
  constructor(status, data, message = "Success") {
    this.status = status;
    this.message = message;
    this.success = status < 400;
    this.data = data;
  }
}

export { ApiResponse };
