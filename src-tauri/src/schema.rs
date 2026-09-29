use serde_json::Value;
use std::{
    collections::HashSet,
    path::{Component, Path},
};

pub fn validate(project: &Value) -> Result<(), String> {
    if project["version"].as_u64() != Some(1) {
        return Err("Unsupported project version".into());
    }
    for key in ["id", "name"] {
        if project[key]
            .as_str()
            .filter(|s| !s.is_empty() && s.len() <= 512)
            .is_none()
        {
            return Err(format!("Invalid {key}"));
        }
    }
    let template = &project["template"];
    let kind = template["kind"].as_str().unwrap_or("");
    if !["rectangular", "square", "circle", "bold"].contains(&kind) {
        return Err("Invalid template".into());
    }
    for key in ["width", "height"] {
        number(template, key, 64.0, 4096.0)?;
    }
    let ratio = match kind {
        "rectangular" => 3.4 / 2.2,
        "bold" => 3.0 / 4.0,
        _ => 1.0,
    };
    if (template["height"].as_f64().unwrap() - template["width"].as_f64().unwrap() * ratio).abs()
        > 1.0
    {
        return Err("Template dimensions must preserve the height:width ratio".into());
    }
    number(
        template,
        "safeInset",
        0.0,
        template["width"]
            .as_f64()
            .unwrap()
            .min(template["height"].as_f64().unwrap())
            / 2.0,
    )?;
    number(template, "outlineWidth", 0.0, 32.0)?;
    color(template, "fill")?;
    color(template, "outline")?;
    let assets = project["assets"].as_array().ok_or("Invalid assets")?;
    let elements = project["elements"].as_array().ok_or("Invalid elements")?;
    if elements.len() > 5000 || assets.len() > 500 {
        return Err("Project exceeds element or asset limits".into());
    }
    let mut ids = HashSet::new();
    let mut asset_ids = HashSet::new();
    for asset in assets {
        let id = asset["id"]
            .as_str()
            .filter(|s| valid_id(s))
            .ok_or("Invalid asset id")?;
        if !asset_ids.insert(id) {
            return Err("Duplicate asset id".into());
        }
        let path = asset["path"].as_str().ok_or("Invalid asset path")?;
        validate_relative(path)?;
        if !["image/png", "image/jpeg", "image/webp"]
            .contains(&asset["mime"].as_str().unwrap_or(""))
        {
            return Err("Unsupported image format".into());
        }
    }
    for el in elements {
        let id = el["id"]
            .as_str()
            .filter(|s| valid_id(s))
            .ok_or("Invalid element id")?;
        if !ids.insert(id) {
            return Err("Duplicate element id".into());
        }
        let kind = el["kind"].as_str().unwrap_or("");
        if !["rectangle", "ellipse", "text", "image"].contains(&kind) {
            return Err("Invalid element kind".into());
        }
        for key in ["x", "y"] {
            number(el, key, -32768.0, 32768.0)?;
        }
        for key in ["width", "height"] {
            number(el, key, 1.0, 16384.0)?;
        }
        number(el, "rotation", -36000.0, 36000.0)?;
        number(el, "opacity", 0.0, 1.0)?;
        color(el, "fill")?;
        for key in ["visible", "locked"] {
            if !el[key].is_boolean() {
                return Err(format!("Invalid {key}"));
            }
        }
        if el["name"].as_str().is_none() {
            return Err("Invalid element name".into());
        }
        if kind == "text" {
            number(el, "fontSize", 1.0, 1024.0)?;
            if el["text"].as_str().filter(|s| s.len() <= 10000).is_none() {
                return Err("Invalid text".into());
            }
        }
        if kind == "image" && !asset_ids.contains(el["assetId"].as_str().unwrap_or("")) {
            return Err("Missing image asset reference".into());
        }
    }
    Ok(())
}

fn number(value: &Value, key: &str, min: f64, max: f64) -> Result<(), String> {
    if value[key]
        .as_f64()
        .filter(|n| n.is_finite() && *n >= min && *n <= max)
        .is_none()
    {
        return Err(format!("Invalid {key}: expected {min} to {max}"));
    }
    Ok(())
}

fn valid_id(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 128
        && value
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'-' || c == b'_')
}

fn color(value: &Value, key: &str) -> Result<(), String> {
    let s = value[key].as_str().unwrap_or("");
    if s.len() != 7 || !s.starts_with('#') || !s[1..].bytes().all(|c| c.is_ascii_hexdigit()) {
        return Err(format!("Invalid {key} color"));
    }
    Ok(())
}

pub fn validate_relative(path: &str) -> Result<(), String> {
    let parts: Vec<_> = Path::new(path).components().collect();
    if path.contains('\\')
        || path.contains(':')
        || parts.len() != 2
        || parts[0] != Component::Normal("assets".as_ref())
        || !matches!(parts[1], Component::Normal(_))
    {
        return Err("Asset paths must be relative files inside assets/".into());
    }
    Ok(())
}
