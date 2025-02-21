package com.example.carbonwise.ui.friends

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.example.carbonwise.databinding.ItemIncomingRequestBinding

class IncomingRequestsAdapter(
    private var requests: MutableList<String>,
    private val onAccept: (String) -> Unit,
    private val onReject: (String) -> Unit
) : RecyclerView.Adapter<IncomingRequestsAdapter.RequestViewHolder>() {

    class RequestViewHolder(val binding: ItemIncomingRequestBinding) : RecyclerView.ViewHolder(binding.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RequestViewHolder {
        val binding = ItemIncomingRequestBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return RequestViewHolder(binding)
    }

    override fun onBindViewHolder(holder: RequestViewHolder, position: Int) {
        val request = requests[position]
        holder.binding.textFriendRequest.text = request

        holder.binding.buttonAccept.setOnClickListener {
            onAccept(request)
        }

        holder.binding.buttonReject.setOnClickListener {
            onReject(request)
        }
    }

    override fun getItemCount(): Int = requests.size

    fun updateRequests(newRequests: List<String>) {
        requests.clear()
        requests.addAll(newRequests)
        notifyDataSetChanged()
    }
}
