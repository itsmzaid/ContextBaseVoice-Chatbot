const validator = (scheme, body) => {
    const { error } = scheme.validate(body, {
      errors: {
        wrap: {
          label: "",
        },
      },
    });
  
    if (error) {
      const { details } = error;
      const message = details.map((i) => i.message).join(",");
      return message;
    }
  
    return error;
  };
  
  export default validator;
  