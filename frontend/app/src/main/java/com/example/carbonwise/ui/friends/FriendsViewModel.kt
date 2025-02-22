package com.example.carbonwise.ui.friends

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel

class FriendsViewModel : ViewModel() {

    private val _friendsList = MutableLiveData<MutableList<String>>(mutableListOf())
    val friendsList: LiveData<MutableList<String>> get() = _friendsList

    private val _incomingRequests = MutableLiveData<MutableList<String>>(mutableListOf())
    val incomingRequests: LiveData<MutableList<String>> get() = _incomingRequests

    fun sendFriendRequest(friendCode: String) {
        _incomingRequests.value = (_incomingRequests.value ?: mutableListOf()).apply {
            add(friendCode)
        }
    }

    fun acceptFriendRequest(friendCode: String) {
        _friendsList.value = (_friendsList.value ?: mutableListOf()).apply {
            add(friendCode)
        }
        _incomingRequests.value = (_incomingRequests.value ?: mutableListOf()).apply {
            remove(friendCode)
        }
    }

    fun rejectFriendRequest(friendCode: String) {
        _incomingRequests.value = (_incomingRequests.value ?: mutableListOf()).apply {
            remove(friendCode)
        }
    }

    fun removeFriend(friendCode: String) {
        _friendsList.value = (_friendsList.value ?: mutableListOf()).apply {
            remove(friendCode)
        }
    }
}
