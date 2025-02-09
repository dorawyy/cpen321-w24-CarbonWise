package com.example.carbonwise.ui.recommendations

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel

class RecommendationsViewModel : ViewModel() {

    private val _text = MutableLiveData<String>().apply {
        value = "RECOMMENDATIONS FRAGMENT"
    }
    val text: LiveData<String> = _text
}