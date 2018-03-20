using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MovementScript : MonoBehaviour {

    public Vector3? StartPosition = null;
    public Vector3? FinishPosition = null;
    public float Speed = 0.0f;

    public bool DestroyAfterFinish = false;

    void Start()
    {
    }

	// Update is called once per frame
	void Update () {
        if (FinishPosition == null)
            return;
        if (transform.position != FinishPosition)
        {
            transform.position = Vector3.MoveTowards(transform.position, FinishPosition.Value, Time.deltaTime * Speed);
            //transform.LookAt(FinishPosition.Value, transform.forward);
            Vector3 direction = FinishPosition.Value - transform.position;
            //Quaternion toRotation = Quaternion.FromToRotation(transform.up, direction);
            //transform.rotation = toRotation;
            //Debug.Log(string.Format("Direction {0}", direction));
            float angle = Mathf.Atan2(-direction.x, direction.y) * Mathf.Rad2Deg;
            transform.rotation = Quaternion.AngleAxis(angle, Vector3.forward);
            //transform.rotation = Quaternion.Lerp(transform.rotation, toRotation, Speed * Time.deltaTime);
            Debug.Log(string.Format("speed {0}", Speed));
        }
        else if (DestroyAfterFinish)
        {
            DestroyObject(this.gameObject);
        }
        //{

        //    if (Speed == null)
        //    {
        //        transform.position = FinishPosition.Value;
        //    }
        //    else
        //    {
        //        transform.position = Vector3.MoveTowards(transform.position, FinishPosition.Value, Time.deltaTime * Speed.Value);
        //    }

        //    var newDir = Vector3.RotateTowards(transform.position, FinishPosition.Value - transform.position, 100f, 10f);
        //    Debug.Log(string.Format("New dir {0}", newDir));
        //    transform.rotation = Quaternion.LookRotation(newDir);
        //}
    }

    public void Set(Vector3 startPosition, Vector3 finishPosition, float speed)
    {
        transform.position = startPosition;
        StartPosition = startPosition;
        FinishPosition = finishPosition;
        Speed = speed;
        Debug.Log(string.Format("sset peed {0}", Speed));
    }
}
