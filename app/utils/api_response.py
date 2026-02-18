from flask import jsonify

def api_response(success, data=None, error=None, status_code=200):
    """
    Standardized API Response format.
    {
        "success": boolean,
        "data": any,
        "error": string | null
    }
    """
    response = {
        "success": success,
        "data": data,
        "error": error
    }
    return jsonify(response), status_code

def success_response(data=None, status_code=200):
    return api_response(True, data=data, status_code=status_code)

def error_response(message, status_code=400):
    return api_response(False, error=message, status_code=status_code)
