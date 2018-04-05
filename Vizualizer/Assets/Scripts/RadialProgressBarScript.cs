using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class RadialProgressBarScript : MonoBehaviour {

    public Transform LoadingBar;
    public Transform TextIndicator;
    public float CurrentAmount;
    public float Speed;

	// Use this for initialization
	void Start () {
		
	}
	
	void Update () {
		if (CurrentAmount < 100)
        {
            CurrentAmount += Speed * Time.deltaTime;
            TextIndicator.GetComponent<Text>().text = ((int)CurrentAmount).ToString() + "%";
        }
        else
        {
            TextIndicator.GetComponent<Text>().text = "100%";
            Destroy(this.gameObject);
        }

        LoadingBar.GetComponent<Image>().fillAmount = CurrentAmount / 100;
	}
}
