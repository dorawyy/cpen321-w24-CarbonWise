package com.example.carbonwise.ui.friends

import android.util.Log
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.example.carbonwise.network.ApiService
import com.example.carbonwise.network.EcoscoreResponse
import com.example.carbonwise.network.Friend
import com.example.carbonwise.network.FriendRequest
import com.example.carbonwise.network.FriendRequestBody
import com.example.carbonwise.network.UUIDResponse
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class FriendsViewModel(private val apiService: ApiService, private var token: String) : ViewModel() {

    init {
        fetchUserFriendCode()
        fetchFriends()
        fetchFriendRequests()
    }

    private val _friendsList = MutableLiveData<List<Friend>>()
    val friendsList: LiveData<List<Friend>> get() = _friendsList

    private val _incomingRequests = MutableLiveData<List<FriendRequest>>()
    val incomingRequests: LiveData<List<FriendRequest>> get() = _incomingRequests

    private val _friendActions = MutableLiveData<String>()

    private val _userFriendCode = MutableLiveData<String>()
    val userFriendCode: LiveData<String> get() = _userFriendCode

    fun updateToken(newToken: String) {
        Log.d("FriendsViewModel", "Updating token: $newToken")
        token = newToken
    }

    private val _friendEcoscores = MutableLiveData<Map<String, Double>>()
    val friendEcoscores: LiveData<Map<String, Double>> get() = _friendEcoscores

    fun fetchAllFriendEcoscores(friendList: List<Friend>) {
        val ecoscoreMap = mutableMapOf<String, Double>()
        for (friend in friendList) {
            apiService.getFriendEcoscore(token, friend.user_uuid).enqueue(object : Callback<EcoscoreResponse> {
                override fun onResponse(call: Call<EcoscoreResponse>, response: Response<EcoscoreResponse>) {
                    if (response.isSuccessful) {
                        response.body()?.ecoscoreScore?.let { score ->
                            ecoscoreMap[friend.user_uuid] = score
                            _friendEcoscores.postValue(ecoscoreMap)
                        }
                    }
                }
                override fun onFailure(call: Call<EcoscoreResponse>, t: Throwable) {
                    // Log failure if necessary
                }
            })
        }
    }


    fun fetchUserFriendCode() {
        apiService.getUUID(token).enqueue(object : Callback<UUIDResponse> {
            override fun onResponse(call: Call<UUIDResponse>, response: Response<UUIDResponse>) {
                if (response.isSuccessful) {
                    _userFriendCode.value = response.body()?.user_uuid ?: "Unknown"
                } else {
                    _userFriendCode.value = "Error fetching code"
                }
            }

            override fun onFailure(call: Call<UUIDResponse>, t: Throwable) {
                _userFriendCode.value = "Error: ${t.message}"
            }
        })
    }

    fun fetchFriends() {
        apiService.getFriends(token).enqueue(object : Callback<List<Friend>> {
            override fun onResponse(call: Call<List<Friend>>, response: Response<List<Friend>>) {
                if (response.isSuccessful) {
                    val friendList = response.body() ?: emptyList()
                    _friendsList.value = friendList
                    fetchAllFriendEcoscores(friendList)
                    Log.e("HAHA", response.body().toString())
                } else {
                    _friendActions.value = "Failed to load friends"
                }
            }

            override fun onFailure(call: Call<List<Friend>>, t: Throwable) {
                _friendActions.value = "Error fetching friends: ${t.message}"
            }
        })
    }

    fun fetchFriendRequests() {
        Log.e("friend", "FETCHING REQUESTS")
        apiService.getFriendRequests(token).enqueue(object : Callback<List<FriendRequest>> {
            override fun onResponse(call: Call<List<FriendRequest>>, response: Response<List<FriendRequest>>) {
                if (response.isSuccessful) {
                    _incomingRequests.value = response.body() ?: emptyList()
                } else {
                    _friendActions.value = "Failed to load friend requests"
                }
            }

            override fun onFailure(call: Call<List<FriendRequest>>, t: Throwable) {
                _friendActions.value = "Error fetching friend requests: ${t.message}"
            }
        })
    }

    fun sendFriendRequest(friendUuid: String) {
        val requestBody = FriendRequestBody(friendUuid)
        apiService.sendFriendRequest(token, requestBody).enqueue(object : Callback<Void> {
            override fun onResponse(call: Call<Void>, response: Response<Void>) {
                if (response.isSuccessful) {
                    fetchFriendRequests()
                    _friendActions.value = "Friend request sent!"
                } else {
                    _friendActions.value = "Failed to send friend request"
                }
            }

            override fun onFailure(call: Call<Void>, t: Throwable) {
                _friendActions.value = "Error sending friend request: ${t.message}"
            }
        })
    }

    fun acceptFriendRequest(friendUuid: String) {
        val requestBody = FriendRequestBody(friendUuid)
        apiService.acceptFriendRequest(token, requestBody).enqueue(object : Callback<Void> {
            override fun onResponse(call: Call<Void>, response: Response<Void>) {
                if (response.isSuccessful) {
                    fetchFriends()
                    fetchFriendRequests()
                    _friendActions.value = "Friend request accepted!"
                } else {
                    _friendActions.value = "Failed to accept friend request"
                }
            }

            override fun onFailure(call: Call<Void>, t: Throwable) {
                _friendActions.value = "Error accepting friend request: ${t.message}"
            }
        })
    }

    fun rejectFriendRequest(friendUuid: String) {
        apiService.rejectFriendRequest(token, friendUuid).enqueue(object : Callback<Void> {
            override fun onResponse(call: Call<Void>, response: Response<Void>) {
                if (response.isSuccessful) {
                    fetchFriendRequests()
                    _friendActions.value = "Friend request rejected"
                } else {
                    _friendActions.value = "Failed to reject friend request"
                }
            }

            override fun onFailure(call: Call<Void>, t: Throwable) {
                _friendActions.value = "Error rejecting friend request: ${t.message}"
            }
        })
    }

    fun removeFriend(friendUuid: String) {
        apiService.removeFriend(token, friendUuid).enqueue(object : Callback<Void> {
            override fun onResponse(call: Call<Void>, response: Response<Void>) {
                if (response.isSuccessful) {
                    fetchFriends()
                    _friendActions.value = "Friend removed"
                } else {
                    _friendActions.value = "Failed to remove friend"
                }
            }

            override fun onFailure(call: Call<Void>, t: Throwable) {
                _friendActions.value = "Error removing friend: ${t.message}"
            }
        })
    }

    class Factory(private val apiService: ApiService, private val token: String) : ViewModelProvider.Factory {
        override fun <T : ViewModel> create(modelClass: Class<T>): T {
            if (modelClass.isAssignableFrom(FriendsViewModel::class.java)) {
                @Suppress("UNCHECKED_CAST")
                return FriendsViewModel(apiService, token) as T
            }
            throw IllegalArgumentException("Unknown ViewModel class")
        }
    }
}
