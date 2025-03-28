package com.example.carbonwise.ui.login

import android.content.Context
import android.content.Intent
import android.content.IntentSender
import android.net.ConnectivityManager
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import com.example.carbonwise.BuildConfig
import com.example.carbonwise.MainActivity
import com.example.carbonwise.R
import com.example.carbonwise.databinding.FragmentLoginBinding
import com.google.android.gms.auth.api.identity.BeginSignInRequest
import com.google.android.gms.auth.api.identity.Identity
import com.google.android.gms.auth.api.identity.SignInClient
import com.google.android.gms.auth.api.identity.SignInCredential
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.MediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import org.json.JSONObject
import java.io.IOException

class LoginFragment : BottomSheetDialogFragment() {

    private var _binding: FragmentLoginBinding? = null
    private val binding get() = _binding!!

    private lateinit var oneTapClient: SignInClient
    private lateinit var signInRequest: BeginSignInRequest
    private lateinit var googleSignInClient: GoogleSignInClient

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentLoginBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        oneTapClient = Identity.getSignInClient(requireActivity())
        googleSignInClient = GoogleSignIn.getClient(
            requireContext(),
            GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                .requestIdToken(BuildConfig.GOOGLE_AUTH_KEY)
                .requestEmail()
                .build()
        )

        signInRequest = BeginSignInRequest.builder()
            .setGoogleIdTokenRequestOptions(
                BeginSignInRequest.GoogleIdTokenRequestOptions.builder()
                    .setSupported(true)
                    .setServerClientId(BuildConfig.GOOGLE_AUTH_KEY)
                    .setFilterByAuthorizedAccounts(false)
                    .build()
            )
            .setAutoSelectEnabled(true)
            .build()

        val connectivityManager = context?.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val activeNetwork = connectivityManager.activeNetworkInfo
        if (activeNetwork == null || !activeNetwork.isConnected) {
            Toast.makeText(context, "No internet connection", Toast.LENGTH_SHORT).show()
        }

        activity?.let { activity ->
            oneTapClient.beginSignIn(signInRequest)
                .addOnSuccessListener(activity) { result ->
                    if (isAdded) {
                        try {
                            startIntentSenderForResult(
                                result.pendingIntent.intentSender,
                                REQ_ONE_TAP,
                                null,
                                0,
                                0,
                                0,
                                null
                            )
                        } catch (e: IntentSender.SendIntentException) {
                            Log.e(TAG, "Error starting IntentSender", e)
                            val signInIntent = googleSignInClient.signInIntent
                            startActivityForResult(signInIntent, REQ_SIGN_IN)
                        }
                    }
                }
                .addOnFailureListener(activity) { e ->
                    Log.e(TAG, "Google One Tap Sign-In failed", e)
                    val signInIntent = googleSignInClient.signInIntent
                    startActivityForResult(signInIntent, REQ_SIGN_IN)
                }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        when (requestCode) {
            REQ_ONE_TAP -> handleOneTapSignIn(data)
            REQ_SIGN_IN -> handleRegularSignIn(data)
        }
    }

    private fun handleOneTapSignIn(data: Intent?) {
        try {
            val credential: SignInCredential = oneTapClient.getSignInCredentialFromIntent(data)
            val idToken = credential.googleIdToken
            if (idToken != null) {
                processSignIn(idToken)
            } else {
                if (!isAdded || _binding == null) return
                Toast.makeText(context, "Sign-in failed. Please try again.", Toast.LENGTH_LONG).show()
                binding.loginProgressBar.visibility = View.GONE
                binding.loginStatusText.visibility = View.GONE
                findNavController().navigate(R.id.navigation_scan)
                Log.e(TAG, "No ID token found!")
            }
        } catch (e: ApiException) {
            if (!isAdded || _binding == null) return
            Toast.makeText(context, "Sign-in failed. Please try again.", Toast.LENGTH_LONG).show()
            binding.loginProgressBar.visibility = View.GONE
            binding.loginStatusText.visibility = View.GONE
            findNavController().navigate(R.id.navigation_scan)
            Log.e(TAG, "One Tap Sign-in failed", e)
        }
    }

    private fun handleRegularSignIn(data: Intent?) {
        try {
            val task = GoogleSignIn.getSignedInAccountFromIntent(data)
            val account = task.getResult(ApiException::class.java)
            val idToken = account?.idToken
            if (idToken != null) {
                processSignIn(idToken)
            } else {
                Toast.makeText(context, "Sign-in failed. Please try again.", Toast.LENGTH_LONG).show()
                Log.e(TAG, "Google Sign-In failed: No ID Token found.")
            }
        } catch (e: ApiException) {
            Toast.makeText(context, "Sign-in failed. Please try again.", Toast.LENGTH_LONG).show()
            Log.e(TAG, "Regular Google Sign-In failed", e)
        }
    }

    private fun processSignIn(idToken: String) {
        Log.d(TAG, "Google ID Token: $idToken")
        val sharedPref = requireContext().getSharedPreferences("AppPrefs", Context.MODE_PRIVATE)
        with(sharedPref.edit()) {
            putString("google_id_token", idToken)
            apply()
        }

        viewLifecycleOwner.lifecycleScope.launch {
            val jwtToken = getJWT(idToken)
            if (jwtToken != null) {
                Log.e(TAG, "Got JWT Token: $jwtToken")
                with(sharedPref.edit()) {
                    putString("jwt_token", jwtToken)
                    apply()
                }
                if (isAdded) {
                    (activity as? MainActivity)?.switchToLoggedInMode()
                    dismiss()
                }
            } else {
                Toast.makeText(context, "Sign-in failed. Please try again.", Toast.LENGTH_LONG).show()
                Log.e(TAG, "Failed to obtain JWT token.")
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    override fun onDestroy() {
        super.onDestroy()
        if (::oneTapClient.isInitialized) {
            oneTapClient.signOut()
        }
    }

    private suspend fun getJWT(googleIdToken: String): String? {
        val url = "https://api.cpen321-jelx.com/auth/google"
        val jsonBody = """
        {
            "google_id_token": "$googleIdToken"
        }
        """.trimIndent()
        val requestBody = RequestBody.create(MediaType.get("application/json"), jsonBody)
        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .build()

        val client = OkHttpClient()
        return withContext(Dispatchers.IO) {
            try {
                val response = client.newCall(request).execute()
                if (response.isSuccessful) {
                    val responseBody = response.body()?.string()
                    val jsonObject = JSONObject(responseBody)
                    jsonObject.optString("token")
                } else {
                    Log.e(TAG, "Request failed with code: ${response.code()}")
                    null
                }
            } catch (e: IOException) {
                Log.e(TAG, "Request failed: ${e.message}")
                null
            }
        }
    }

    companion object {
        private const val TAG = "LoginFragment"
        private const val REQ_ONE_TAP = 9001
        private const val REQ_SIGN_IN = 9002
    }
}
