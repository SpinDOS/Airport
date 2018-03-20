using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MapScript : MonoBehaviour {

    // Use this for initialization
    void Start () {

	}
	
	// Update is called once per frame
	void Update () {
		
	}

    public Vector3? GetLocation(string location)
    {
        var result = transform.Find(location);
        return result == null ? null : (Vector3?) result.position;
    }
}
