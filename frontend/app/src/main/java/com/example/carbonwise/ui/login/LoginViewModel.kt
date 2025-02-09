package com.example.carbonwise.ui.login

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel

class LoginViewModel : ViewModel() {

    private val _text = MutableLiveData<String>().apply {
        value = "LOGIN FRAGMENT"
    }
    val text: LiveData<String> = _text
}