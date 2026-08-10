def safe_str(value):
    return "N/A" if value is None else str(value)

def safe_float_list(value):
    if value is None:
        return [1.0, 1.0]
    if hasattr(value, '__iter__') and not isinstance(value, str):
        return [float(v) for v in value]
    return [float(value), float(value)]